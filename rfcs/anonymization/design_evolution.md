# Design Evolution: Replacing the Inline Executor

## The starting point

The inference lifecycle hooks — `beforeCompletion`, `afterCompletion`, `aroundCompletion` — need to run *synchronously*. They sit in the hot path of every LLM call: `chatComplete` must block until the hook finishes and return the hook's output before the LLM connector is called.

The existing workflow engine runs asynchronously (Task Manager, background jobs, Elasticsearch writes). Rather than add a proper sync mode, the initial implementation introduced a standalone inline executor: a self-contained function that iterated over a workflow's steps directly, managed its own template evaluation, and returned a result in a single call. It ran entirely in memory, bypassed `WorkflowExecutionRuntimeManager`, and emitted nothing to any observability sink.

This worked. It also created three problems that grew more visible as the feature matured.

---

## Problem 1: A second engine with no observability

The inline executor was effectively a second workflow engine. It shared the YAML definition format and the step registry, but everything else — APM instrumentation, event log writes, EBT events — was absent. A slow step, a timeout, or a step failure in a sync workflow produced no trace anywhere. You could not tell from dashboards or logs whether anonymization was running, how long it was taking, or why it was failing.

The engine and the inline executor also diverged in how they handled step dispatch. Bug fixes to templating, input validation, or error handling applied to one but not the other.

**The fix:** sync mode became a first-class execution mode of the same engine. Sync runs use the same step dispatch path (`StepDispatcher`) as async runs, emit to the same event log and APM spans, and are distinguished by a `mode: 'sync'` tag on every entry. A synthetic execution ID (`sync_<uuid>`) takes the place of the Saved Object–backed ID that async runs produce, since sync runs are not persisted. The inline executor shrank to a thin coordinator that sets up an in-memory execution store and calls `StepDispatcher` in a loop.

Sync runs are restricted to linear step sequences: no structural branching, no parallel blocks, no loops. This is a graph topology constraint, not an expression constraint. Per-step guard conditions — `if: 'event.agentId == "my-agent"'` — are fine; they determine whether a step in a fixed list is executed or skipped. What is rejected is anything that changes which steps exist in the path: `if/else` constructs that route to different step sequences, `foreach` that dynamically multiplies steps, `parallel` blocks, and similar constructs that turn the workflow definition into a graph rather than a list.

This constraint is validated at workflow registration time, not at execution time. A workflow that includes a structural branch under a sync trigger is rejected when it is installed, not when a user's LLM call runs.

---

## Problem 2: Capabilities were an opaque bag with no contract

The lifecycle hooks needed to pass call-scoped objects to step handlers — things that cannot be serialised into a YAML event payload, like the `proceedFn` that actually performs the LLM call (a JavaScript function reference). These were passed as a `capabilities` argument alongside the event:

```ts
// caller side
invokeHook('inference.aroundCompletion', event, {
  proceedFn: async (params) => { /* ... */ },
  anonymizationContext: ctx,          // opaque object
});

// step handler side
const ctx = capabilities['anonymizationContext'] as AnonymizationContextHandle; // cast
```

The bag was typed as `Record<string, unknown>`. Step handlers cast their way to the values they needed. There was no way to know at registration time whether a workflow's steps would receive the capabilities they required. A misconfigured workflow — a step that expected `anonymizationContext` under a trigger that did not provide it — would fail silently at runtime when the cast returned `undefined`.

**The fix:** capabilities became a closed, typed registry. Every capability the engine can carry is listed once with a declared TypeScript type and a Zod validator:

```ts
interface KnownCapabilities {
  proceedFn: (params: ChatCompleteParams) => Promise<ChatCompleteResult>;
}
```

Triggers declare which capabilities they provide; steps declare which they require. The engine validates subset inclusion at registration time — if a step requires `proceedFn` but its trigger does not provide it, the workflow is rejected when installed. At dispatch time, each capability's payload is parsed through its Zod schema before being handed to the handler, so type errors are caught before the handler runs rather than inside it.

Step handler types narrow automatically based on the declared requirements:

```ts
createServerStepDefinition({
  requiresCapabilities: ['proceedFn'],
  handler: async (ctx) => {
    // ctx.capabilities.proceedFn is typed correctly here
    const result = await ctx.capabilities.proceedFn(params);
  },
});
```

---

## Problem 3: The token map was invisible to the YAML

The token map — the lookup table from an anonymization token back to its original value — needed to travel from `beforeCompletion` to `afterCompletion`. The initial approach attached it to an `AnonymizationContext` object and passed it as a capability alongside the event:

```ts
// invokeBeforeCompletion
const ctx = new AnonymizationContext(salt);
await invokeHook('inference.beforeCompletion', event, { anonymizationContext: ctx });

// after the hook, read the token map back out of the context
const tokenMap = ctx.tokenMap;

// invokeAfterCompletion
await invokeHook('inference.afterCompletion', event, { anonymizationContext: ctx });
```

The YAML workflow for `afterCompletion` looked like this:

```yaml
steps:
  - name: restore_response
    type: transform.pii_restore
    with:
      input: '{{ event.response }}'
```

The `transform.pii_restore` step "just worked" because it retrieved the token map from `capabilities.anonymizationContext` inside its handler. Read the YAML and you have no idea where the token map comes from. Read the step's declared input schema and there is no `tokenMap` field. The schema lied about what the step needed.

**The fix:** the token map flows as ordinary workflow data. The `ai.pii` step produces a `tokenMap` output. The caller passes `salt` in the event. Chained steps pass the accumulated token map forward through normal output references:

```yaml
# before-completion workflow
steps:
  - name: anonymize_system
    type: ai.pii
    if: 'event.system'
    with:
      input: '{{ event.system }}'
      salt: '{{ event.salt }}'
      entities: [IP, EMAIL, HOST_NAME]

  - name: anonymize_messages
    type: ai.pii
    with:
      input: '${{ event.messages }}'
      salt: '{{ event.salt }}'
      tokenMap: '${{ steps.anonymize_system.output.tokenMap }}'
      entities: [IP, EMAIL, HOST_NAME]

  - name: emit_output
    type: workflow.output
    with:
      system: '${{ steps.anonymize_system.output.output }}'
      messages: '${{ steps.anonymize_messages.output.output }}'
      tokenMap: '${{ steps.anonymize_messages.output.tokenMap }}'
```

```yaml
# after-completion workflow (tokenMap arrives as event data)
steps:
  - name: restore_response
    type: transform.pii_restore
    with:
      input: '{{ event.response }}'
      tokenMap: '${{ event.tokenMap }}'

  - name: emit_output
    type: workflow.output
    with:
      response: '{{ steps.restore_response.output.output }}'
```

The YAML now tells the whole story. Every input a step consumes is either in the event or in a prior step's declared output. The inference plugin reads the token map from the hook result's `output` field — a plain `Record<string, { original, entityClass }>` — and passes it as a field in the `afterCompletion` event. No hidden objects, no capability side-channels for data.

Capabilities are now strictly for things that genuinely cannot be expressed as YAML data. After this change, the only capability the lifecycle hooks carry is `proceedFn` on the `aroundCompletion` trigger — a JavaScript function reference that calls the LLM. Everything else is data.

---

## Problem 4: The around path had its own mental model

The `aroundCompletion` trigger wrapped both anonymization and de-anonymization in a single workflow. To return the anonymized inputs to the caller on the streaming path, the initial design used a scratch mechanism on the `AnonymizationContext` object:

```ts
// inside an ai.pii step handler
capabilities.anonymizationContext.setField('system', anonymizedSystem);
capabilities.anonymizationContext.setField('messages', anonymizedMessages);

// in invokeAroundCompletion, after the hook returns
const anonymizedSystem = ctx.getField('system');
const anonymizedMessages = ctx.getField('messages');
```

This was a completely different pattern from the before/after hooks, which returned data through declared `workflow.output` steps. The around path bypassed workflow outputs entirely and communicated through a mutable shared object.

**The fix:** the around workflow uses `workflow.output` like every other workflow. The `ai.pii` steps produce their outputs through the normal step chain. The final step declares what the caller receives:

```yaml
# around-completion workflow
steps:
  - name: anonymize_system
    type: ai.pii
    if: 'event.system'
    with:
      input: '{{ event.system }}'
      salt: '{{ event.salt }}'
      entities: [IP, EMAIL, HOST_NAME]

  - name: anonymize_messages
    type: ai.pii
    with:
      input: '${{ event.messages }}'
      salt: '{{ event.salt }}'
      tokenMap: '${{ steps.anonymize_system.output.tokenMap }}'
      entities: [IP, EMAIL, HOST_NAME]

  - name: proceed_to_llm
    type: call_site.proceed
    with:
      system: '{{ steps.anonymize_system.output.output }}'
      messages: '${{ steps.anonymize_messages.output.output }}'

  - name: restore_result
    type: transform.pii_restore
    with:
      input: '{{ steps.proceed_to_llm.output.response }}'
      tokenMap: '${{ steps.anonymize_messages.output.tokenMap }}'

  - name: emit_output
    type: workflow.output
    with:
      system: '{{ steps.anonymize_system.output.output }}'
      messages: '${{ steps.anonymize_messages.output.output }}'
      result: '{{ steps.restore_result.output.output }}'
      tokenMap: '${{ steps.anonymize_messages.output.tokenMap }}'
```

The caller reads `result.output.system`, `result.output.messages`, `result.output.tokenMap` from the hook result — the same pattern it uses for every other hook. `AnonymizationContext`, `setField`, `getField`, and the context handle interface were all deleted.

---

## Net result

The four changes together replace a patchwork of workarounds with a coherent design.

| Before | After |
|---|---|
| Inline executor: a second workflow engine with no observability | Sync mode: first-class execution using the same engine, same event log, same APM spans |
| `capabilities: Record<string, unknown>` — untyped, unvalidated | Closed `KnownCapabilities` registry — typed, Zod-validated at dispatch, subset-checked at registration |
| Token map hidden in a capability object invisible to the YAML | Token map flows as declared step output and event data — readable in the YAML |
| Around path uses `setField`/`getField` on a mutable scratch object | Around path uses `workflow.output` — same pattern as every other workflow |

The invariant the design now holds: if you can read the YAML and you understand what each step type does, you understand the full data flow. There are no hidden objects, no capability side-channels for data, and no cases where you need to look outside the workflow definition to understand what a step consumes or produces.
