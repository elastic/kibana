# Agent Builder Integration

> Agent Builder uses lifecycle hooks at three points in the chat round: **before the chat round** (guardrails), **before inference** (PII anonymization), and **after inference** (PII de-anonymization). This document covers trigger registrations, workflow YAML examples, and caller code.

## Trigger Registrations

All three hooks are registered in the Agent Builder server plugin setup:

```typescript
// x-pack/platform/plugins/shared/agent_builder/server/plugin.ts — setup()

import { z } from '@kbn/zod/v4';

// ── Hook 1: Before Chat Round (Guardrails) ──────────────────────────────────
// Runs before the user's message reaches the agent. Used for content policy
// checks (off-topic, PII, custom rules). If the workflow calls workflow.fail,
// the chat round is blocked.
workflowsExtensions.registerTriggerDefinition({
  id: 'agent-builder.beforeChatRound',
  eventSchema: z.object({
    message: z.string().describe('The user message for this chat round'),
    agentId: z.string().optional().describe('The agent handling this round'),
  }),
  sync: {
    outputSchema: z.object({
      passed: z.boolean().describe('Whether all checks passed'),
    }),
    maxTimeout: '10s',
    failurePolicy: 'closed',      // guardrails MUST block on failure
  },
});

// ── Hook 2: Before Inference (PII Anonymization) ────────────────────────────
// Runs before the LLM sees the message. Detects PII and returns anonymized
// text plus a token map that the caller passes to the after-inference hook.
workflowsExtensions.registerTriggerDefinition({
  id: 'agent-builder.beforeInference',
  eventSchema: z.object({
    message: z.string().describe('The raw user message to anonymize'),
    agentId: z.string().optional().describe('The agent handling this round'),
  }),
  sync: {
    outputSchema: z.object({
      message: z.string().describe('The anonymized message (tokens substituted for PII)'),
      tokenMap: z.record(
        z.string(),
        z.object({
          original: z.string(),
          entity: z.string(),
        })
      ).describe('Map of token → { original value, entity type }. Empty object if no PII found.'),
    }),
    maxTimeout: '10s',
    failurePolicy: 'open',        // if anonymization fails, proceed with raw message
  },
});

// ── Hook 3: After Inference (PII De-anonymization) ──────────────────────────
// Runs after the LLM responds. Receives the token map from the before-inference
// output and restores original PII values in the response.
workflowsExtensions.registerTriggerDefinition({
  id: 'agent-builder.afterInference',
  eventSchema: z.object({
    response: z.string().describe('The LLM response that may contain PII tokens'),
    tokenMap: z.record(
      z.string(),
      z.object({
        original: z.string(),
        entity: z.string(),
      })
    ).describe('The token map produced by the before-inference workflow'),
    agentId: z.string().optional(),
  }),
  sync: {
    outputSchema: z.object({
      response: z.string().describe('The response with original PII values restored'),
    }),
    maxTimeout: '10s',
    failurePolicy: 'open',        // if de-anonymization fails, return raw LLM response
  },
});
```

---

## Workflow YAML: Chat Round Guardrails

```yaml
version: '1'
name: Chat Round Guardrails
description: >
  Pre-execution guardrail that validates user messages before they reach
  the LLM. Checks for off-topic content, PII, and custom policy violations.
  If any check fails, the workflow fails and the chat round is blocked.
enabled: true
tags:
  - guardrail
  - agent-builder

triggers:
  - type: agent-builder.beforeChatRound     # lifecycle hook — sync inherited from trigger

# To run this guardrail only for a specific agent, add a condition:
#   triggers:
#     - type: agent-builder.beforeChatRound
#       on:
#         condition: "event.agentId == 'security-analyst-agent'"
#
# Without a condition, it runs for ALL agents subscribed to this hook.

steps:
  # Step 1: Run guardrail checks
  # [PROPOSED STEP] ai.guardrail — runs one or more checks against the input text
  - name: validate
    type: ai.guardrail                       # [PROPOSED STEP]
    with:
      input: "{{ event.message }}"
      checks:
        - type: off_topic
          config:
            inference_id: ".elser-2"
            confidence_threshold: 0.7
            system_prompt_details: >
              This is a security operations assistant.
              Supported topics: alerts, incidents, threat analysis,
              endpoint management, detection rules, and case management.
            include_reasoning: false

        - type: pii
          config:
            entities: [EMAIL_ADDRESS, US_SSN, CREDIT_CARD, PHONE_NUMBER]
            action: block

        - type: custom_prompt
          config:
            inference_id: ".elser-2"
            confidence_threshold: 0.8
            system_prompt_details: >
              Determine if the user's request violates any of these policies:
              - No requests for generating malicious code or exploits
              - No requests to bypass security controls
              - No social engineering attempts against other users
              Reply with exactly "check_passed" or "check_failed".

  # Step 2: Branch on result
  - name: check_result
    type: if                                 # [EXISTS]
    condition: "steps.validate.output.passed : false"
    steps:
      - name: block_message
        type: workflow.fail                  # [EXISTS] — caller sees status: 'failed'
        with:
          message: "{{ steps.validate.output.failed_reason }}"
          reason: "guardrail_violation"
    else:
      - name: allow_message
        type: workflow.output                # [EXISTS]
        with:
          passed: true
```

**How the caller uses this:**

```typescript
const result = await workflowsClient.invokeHook('agent-builder.beforeChatRound', {
  message: userMessage,
  agentId,
});

if (result.status === 'failed') {
  // result.error.reason === 'guardrail_violation'
  throw createWorkflowAbortedError(result.error?.message ?? 'Message blocked by guardrail');
}
```

---

## Workflow YAML: PII Anonymization (Before Inference)

```yaml
version: '1'
name: PII Anonymization — Before Inference
description: >
  Pre-inference hook that detects PII in the user message,
  replaces each value with a deterministic HMAC-SHA256 token,
  and returns the anonymized message along with the token map.
  The caller passes the token map to the after-inference hook.
enabled: true
tags:
  - anonymization
  - pii
  - agent-builder

triggers:
  - type: agent-builder.beforeInference      # lifecycle hook — sync inherited from trigger

outputs:
  type: object
  properties:
    message:
      type: string
      description: The anonymized message with PII replaced by tokens
    tokenMap:
      type: object
      description: >
        Map of token to original value and entity type.
        Example: { "<tok_abc>": { "original": "555-12-3456", "entity": "US_SSN" } }

steps:
  # [PROPOSED STEP] ai.pii — scans text for PII entities, replaces with HMAC tokens
  - name: anonymise
    type: ai.pii                             # [PROPOSED STEP]
    with:
      input: "{{ event.message }}"
      entities:
        - EMAIL_ADDRESS
        - US_SSN
        - CREDIT_CARD
        - PHONE_NUMBER
        - IP_ADDRESS
        - PERSON_NAME
      action: replace
      replace_strategy: hmac_sha256
      hmac_secret: "{{ consts.pii_hmac_key }}"

  # Return both the anonymized text and the token map
  - name: return_result
    type: workflow.output                    # [EXISTS]
    with:
      message: "{{ steps.anonymise.output.anonymised_text }}"
      tokenMap: "{{ steps.anonymise.output.token_map }}"

consts:
  pii_hmac_key: "REDACTED"
```

---

## Workflow YAML: PII De-anonymization (After Inference)

```yaml
version: '1'
name: PII De-anonymization — After Inference
description: >
  Post-inference hook that restores original PII values in the LLM's
  response using the token map provided by the caller. The token map
  is passed as input — no shared state needed.
enabled: true
tags:
  - anonymization
  - pii
  - agent-builder

triggers:
  - type: agent-builder.afterInference       # lifecycle hook — sync inherited from trigger

outputs:
  type: object
  properties:
    response:
      type: string
      description: The response with original PII values restored

steps:
  - name: check_has_tokens
    type: if                                 # [EXISTS]
    condition: "event.tokenMap : *"
    steps:
      # [PROPOSED STEP] transform.pii_restore — scans for tokens and replaces with originals
      - name: deanonymise
        type: transform.pii_restore          # [PROPOSED STEP]
        with:
          input: "{{ event.response }}"
          token_map: "{{ event.tokenMap }}"

      - name: return_restored
        type: workflow.output                # [EXISTS]
        with:
          response: "{{ steps.deanonymise.output.restored_text }}"
    else:
      - name: return_unchanged
        type: workflow.output                # [EXISTS]
        with:
          response: "{{ event.response }}"
```

---

## Caller Code: Trigger Output Chaining

The PII anonymization and de-anonymization hooks are connected via **trigger output chaining** — the before-hook returns the token map as output, the caller holds it in memory, and passes it as input to the after-hook.

```typescript
// x-pack/platform/plugins/shared/agent_builder/server/services/agents/run_inference.ts

export async function runInferenceWithPiiProtection({
  prompt,
  agentId,
  workflowsClient,
  llm,
  logger,
}: RunInferenceParams) {
  // ── Phase 1: Anonymize ─────────────────────────────────────────────────
  const anonResult = await workflowsClient.invokeHook('agent-builder.beforeInference', {
    message: prompt,
    agentId,
  });

  // failurePolicy: 'open' → if anonymization fails, proceed with original
  const anonymizedPrompt = anonResult.output?.message ?? prompt;
  const tokenMap = anonResult.output?.tokenMap ?? {};

  if (anonResult.status === 'failed') {
    logger.warn(`PII anonymization failed (proceeding with original): ${anonResult.error?.message}`);
  }

  // ── Phase 2: Run inference with the anonymized prompt ──────────────────
  const llmResponse = await llm.inference(anonymizedPrompt);

  // ── Phase 3: De-anonymize ──────────────────────────────────────────────
  // Token map flows through the caller — no shared state needed
  const deanonResult = await workflowsClient.invokeHook('agent-builder.afterInference', {
    response: llmResponse,
    tokenMap,
    agentId,
  });

  const restoredResponse = deanonResult.output?.response ?? llmResponse;

  if (deanonResult.status === 'failed') {
    logger.warn(`PII de-anonymization failed (returning raw response): ${deanonResult.error?.message}`);
  }

  return restoredResponse;
}
```

### Data Flow

```
  Agent Builder (caller)                    Workflow Engine
  ======================                    ==============

  1. User sends: "Call me at 555-12-3456"
     │
     ├── invokeHook('beforeInference',  ──→  Anonymize workflow:
     │     { message: "Call me at              1. ai.pii detects US_SSN
     │       555-12-3456" })                   2. Replaces → "Call me at <tok_abc>"
     │                                         3. workflow.output:
     │   ◄── HookResult ──────────────────        { message: "Call me at <tok_abc>",
     │       output: { message, tokenMap }          tokenMap: { "<tok_abc>":
     │                                                { original: "555-12-3456",
     │  tokenMap held in caller's memory              entity: "US_SSN" } } }
     │
     ├── llm.inference("Call me at <tok_abc>")
     │   ◄── "Sure, I'll call <tok_abc>"
     │
     ├── invokeHook('afterInference',   ──→  De-anonymize workflow:
     │     { response: "Sure, I'll call        1. Checks tokenMap is not empty
     │       <tok_abc>",                       2. transform.pii_restore replaces tokens
     │       tokenMap: { ... } })              3. workflow.output:
     │                                            { response: "Sure, I'll call 555-12-3456" }
     │   ◄── HookResult ──────────────────
     │       output: { response }
     │
     └── Return to user: "Sure, I'll call 555-12-3456"
```

---

## Migration from Current AB Contract

Agent Builder currently uses a custom loop over workflow IDs with a bespoke `BeforeAgentWorkflowOutput` contract:

| Current (custom) | New (lifecycle hooks) |
|---|---|
| Manual `for` loop over `workflowIds` | Single `invokeHook()` call — engine resolves all subscribers |
| `BeforeAgentWorkflowOutput.abort` / `abort_message` | `workflow.fail` with `reason: 'guardrail_violation'` |
| `BeforeAgentWorkflowOutput.new_prompt` | Before-inference hook returns `{ message: modifiedPrompt }` via `workflow.output` |
| `executeWorkflow({ waitForCompletion: true })` per workflow | `invokeHook()` handles execution + result collection |
| Custom output parsing with `normalizeWorkflowOutput` | Typed `HookResult` with `output` matching `outputSchema` |

The new model eliminates the per-team loop, the ad-hoc contract, and the manual workflow ID management. Workflows subscribe via triggers — the engine handles resolution and execution.

---

## Open Question: State Sharing Between Before/After Hooks

The PII anonymization flow requires passing state (the token map) from the before-inference hook to the after-inference hook. Two approaches have been considered:

### Alternative A: Trigger Output Chaining (recommended)

The before-hook returns the token map as output. The caller holds it in local memory and passes it as input to the after-hook. No shared state, no new infrastructure.

```
Before-inference workflow                 Caller                  After-inference workflow
========================                  ======                  =========================
1. Detect PII                             │                       
2. Replace with tokens                    │                       
3. workflow.output:                       │                       
   { message, tokenMap }  ──────────────→ holds tokenMap ───────→ receives tokenMap as event input
                                          │                       1. Scan response for tokens
                                          │                       2. Replace tokens with originals
                                          │                       3. workflow.output: { response }
```

### Alternative B: Ephemeral State

The before-hook writes to `state.ephemeral.set`, the after-hook reads via `state.ephemeral.get`. The two workflows are coupled via a shared key convention.

```
Before-inference workflow                                         After-inference workflow
========================                                          =========================
1. Detect PII                                                     
2. Replace with tokens                                            
3. state.ephemeral.set("pii_map:roundId", tokenMap)               1. state.ephemeral.get("pii_map:roundId")
4. workflow.output: { message }                                   2. Scan response for tokens
                                                                  3. Replace tokens with originals
                                                                  4. state.ephemeral.delete("pii_map:roundId")
                                                                  5. workflow.output: { response }
```

### Comparison

| Concern | Trigger output chaining (A) | Ephemeral state (B) |
|---------|----------------------------|---------------------|
| **Security** | Token map only exists in the caller's local memory and in each workflow's execution context | Any workflow can call `state.ephemeral.get("pii_map:<guessable-round-id>")` and read the PII mapping |
| **Coupling** | Each workflow is fully self-contained — inputs in, outputs out | Two workflows coupled via shared key convention (`"pii_map:{{ event.roundId }}"`) |
| **New infrastructure** | Uses only `workflow.output` — exists today | Requires `state.ephemeral.set/get/delete` — a new storage subsystem |
| **Testability** | Each workflow independently testable with mock inputs | Hard to test in isolation — depends on ephemeral state being set |
| **Observability** | Token map is part of the workflow output — visible in execution history | Token map hidden in ephemeral state — not visible in execution logs |
| **Cleanup** | Nothing to clean up — no persistent state | Must explicitly delete ephemeral state (what if the after-workflow fails?) |
| **Parallel safety** | No shared state — no collision possible | Key collision risk if round IDs are reused or predictable |
# Cases Integration

> The Cases plugin uses lifecycle hooks at two points: **before case creation** and **before comment creation** — to run PII guardrails that block operations containing sensitive data. This document covers trigger registrations, workflow YAML, and caller code.

## Trigger Registrations

```typescript
// x-pack/platform/plugins/shared/cases/server/plugin.ts — setup()

import { z } from '@kbn/zod/v4';

// ── Hook 1: Before Case Creation ─────────────────────────────────────────
// Runs before a case is persisted. Can validate/modify title and description,
// or block creation entirely via workflow.fail.
workflowsExtensions.registerTriggerDefinition({
  id: 'cases.beforeCreate',
  eventSchema: z.object({
    title: z.string().describe('The case title'),
    description: z.string().optional().describe('The case description'),
  }),
  sync: {
    outputSchema: z.object({
      title: z.string(),
      description: z.string().optional(),
    }),
    maxTimeout: '10s',
    failurePolicy: 'open',          // broken workflow should not block case creation
  },
});

// ── Hook 2: Before Comment Creation ──────────────────────────────────────
// Runs before a comment is posted on a case. Scans the comment text for PII
// and blocks the comment if PII is found.
workflowsExtensions.registerTriggerDefinition({
  id: 'cases.beforeComment',
  eventSchema: z.object({
    caseId: z.string().describe('The case ID'),
    comment: z.string().describe('The comment text'),
    owner: z.string().describe('The case owner (e.g. securitySolution)'),
  }),
  sync: {
    outputSchema: z.object({
      passed: z.boolean().describe('Whether the comment passed all checks'),
    }),
    maxTimeout: '10s',
    failurePolicy: 'closed',        // PII guardrails MUST block on failure
  },
});
```

---

## Workflow YAML: Comment PII Guardrail

```yaml
version: '1'
name: Case Comment PII Guardrail
description: >
  Blocks case comments that contain PII. Scans the comment text for
  sensitive data patterns (SSN, credit cards, emails, phone numbers)
  and rejects the comment if any are found.
enabled: true
tags:
  - guardrail
  - pii
  - cases

triggers:
  - type: cases.beforeComment                # lifecycle hook — sync inherited from trigger

steps:
  # Step 1: Scan for PII in the comment
  # [PROPOSED STEP] ai.guardrail — same step type used in Agent Builder guardrails,
  # showing the pattern is reusable across different systems with different triggers.
  - name: validate_comment
    type: ai.guardrail                       # [PROPOSED STEP]
    with:
      input: "{{ event.comment }}"
      checks:
        - type: pii
          config:
            entities:
              - EMAIL_ADDRESS
              - US_SSN
              - CREDIT_CARD
              - PHONE_NUMBER
              - IP_ADDRESS
            action: block

  # Step 2: Block or allow
  - name: check_result
    type: if                                 # [EXISTS]
    condition: "steps.validate_comment.output.passed : false"
    steps:
      - name: block_comment
        type: workflow.fail                  # [EXISTS] — caller sees status: 'failed'
        with:
          message: >
            Comment blocked: PII detected ({{ steps.validate_comment.output.failed_reason }}).
            Please remove sensitive information before posting.
          reason: "pii_detected"
    else:
      - name: allow_comment
        type: workflow.output                # [EXISTS]
        with:
          passed: true
```

**Pattern reusability**: The `ai.guardrail` step is the same step type used in the Agent Builder chat round guardrails. Only the trigger and the input field differ. A workflow author can copy this pattern to any other trigger with minimal changes.

---

## Caller Code

### Case Creation: `x-pack/platform/plugins/shared/cases/server/client/cases/create.ts`

```diff
 export const create = async (
   data: CasePostRequest,
   clientArgs: CasesClientArgs,
-  casesClient: CasesClient
+  casesClient: CasesClient,
+  workflowsClient?: WorkflowsClient
 ): Promise<Case> => {
   // ... validation, auth ...
   const normalizedCase = normalizeCreateCaseRequest(query, customFieldsConfiguration);

+  // ── Lifecycle hook: pre-create ────────────────────────────────────────
+  if (workflowsClient) {
+    const hookResult = await workflowsClient.invokeHook('cases.beforeCreate', {
+      title: normalizedCase.title,
+      description: normalizedCase.description,
+    });
+
+    if (hookResult.status === 'failed') {
+      // failurePolicy: 'open' → log and proceed
+      logger.warn(`Case pre-create hook failed: ${hookResult.error?.message}`);
+    }
+
+    if (hookResult.status === 'completed') {
+      normalizedCase.title = hookResult.output.title;
+      normalizedCase.description = hookResult.output.description;
+    }
+  }
+  // ──────────────────────────────────────────────────────────────────────

   const newCase = await caseService.createCase({
     attributes: transformNewCase({ ...normalizedCase, /* ... */ }),
     id: savedObjectID,
   });
   // ... user actions, notifications ...
   return flattenCaseSavedObject({ savedObject: newCase, /* ... */ });
 };
```

### Comment Creation: `x-pack/platform/plugins/shared/cases/server/client/attachments/add.ts`

```diff
+  // ── Lifecycle hook: pre-comment guardrail ─────────────────────────────
+  if (workflowsClient) {
+    const hookResult = await workflowsClient.invokeHook('cases.beforeComment', {
+      caseId: addArgs.caseId,
+      comment: commentReq.comment,
+      owner: commentReq.owner,
+    });
+
+    if (hookResult.status === 'failed') {
+      // failurePolicy: 'closed' → block the comment
+      throw createCaseError({
+        message: hookResult.error?.message ?? 'Comment blocked by workflow',
+        logger,
+      });
+    }
+  }
+  // ──────────────────────────────────────────────────────────────────────
```

Note the difference in error handling:
- `cases.beforeCreate` has `failurePolicy: 'open'` → the caller logs a warning but proceeds
- `cases.beforeComment` has `failurePolicy: 'closed'` → the caller throws and blocks the operation

### What the Cases team needs to do

1. **Register both triggers** in `plugin.ts` setup (code above)
2. **Add ~15 lines** in `create.ts` for the case creation hook
3. **Add ~12 lines** in `add.ts` for the comment guardrail hook
4. **No workflow management** — users subscribe workflows to `cases.beforeCreate` or `cases.beforeComment` via the workflow authoring UI
# Dashboards Integration

> The Dashboard plugin uses a lifecycle hook at one point: **before creation** — to run PII reduction on the title and description before the dashboard is persisted. This document covers trigger registration, workflow YAML, and caller code.

## Trigger Registration

```typescript
// src/platform/plugins/shared/dashboard/server/plugin.ts — setup()

import { z } from '@kbn/zod/v4';

// Lifecycle hook: runs before a dashboard is saved.
// Input and output schemas are the same shape — the workflow can modify
// title/description and the engine returns the modified fields as output
// without requiring an explicit workflow.output step.
workflowsExtensions.registerTriggerDefinition({
  id: 'dashboard.beforeCreate',
  eventSchema: z.object({
    title: z.string().describe('The dashboard title'),
    description: z.string().optional().describe('The dashboard description'),
  }),
  sync: {
    outputSchema: z.object({
      title: z.string(),
      description: z.string().optional(),
    }),
    maxTimeout: '10s',
    failurePolicy: 'open',         // broken workflow should not block dashboard saves
  },
});
```

Note: the `eventSchema` and `outputSchema` have the **same shape** (`{ title, description }`). This enables the implicit output pattern — see below.

---

## Workflow YAML: PII Reduction on Dashboard Fields

This workflow demonstrates the **implicit output pattern**. Since the trigger's input and output schemas match, the workflow does not need a `workflow.output` step. The engine returns the (potentially modified) event fields as the hook output.

```yaml
version: '1'
name: Dashboard PII Reduction
description: >
  Runs before a dashboard is saved. Scans the title and description
  for PII patterns (SSN, email, credit card) and replaces them with
  masked values. Uses implicit output — no workflow.output step needed
  because the input and output schemas are the same shape.
enabled: true
tags:
  - pii
  - dashboard

triggers:
  - type: dashboard.beforeCreate             # lifecycle hook — sync inherited from trigger

# No explicit outputs declaration needed — the trigger's outputSchema
# matches the eventSchema, so the engine returns modified event fields.

steps:
  # Step 1: Redact PII from the title
  # [EXISTS] data.regexReplace — regex-based replacement, available today
  - name: redact_title
    type: data.regexReplace                  # [EXISTS]
    with:
      input: "{{ event.title }}"
      patterns:
        - pattern: '\b\d{3}-\d{2}-\d{4}\b'
          replacement: '***-**-****'
        - pattern: '\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
          replacement: '[EMAIL REDACTED]'
        - pattern: '\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b'
          replacement: '[CARD REDACTED]'

  # Step 2: Redact PII from the description (if present)
  - name: redact_description
    type: data.regexReplace                  # [EXISTS]
    if: "event.description : *"
    with:
      input: "{{ event.description }}"
      patterns:
        - pattern: '\b\d{3}-\d{2}-\d{4}\b'
          replacement: '***-**-****'
        - pattern: '\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
          replacement: '[EMAIL REDACTED]'
        - pattern: '\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b'
          replacement: '[CARD REDACTED]'

  # No workflow.output step — the engine returns the modified event fields
  # (redact_title.output replaces event.title, redact_description.output
  # replaces event.description) as the hook output automatically.
```

### Why no `workflow.output`?

When the trigger's `eventSchema` and `outputSchema` have the same shape, the engine can return the event object (with any modifications applied by the steps) as the output. The workflow author doesn't need to manually wire each field through a `workflow.output` step.

This matters for usability: if the dashboard event had 7+ fields, an explicit `workflow.output` would require listing all 7 fields — both in the YAML and in the caller code. The implicit pattern eliminates that boilerplate.

If the schemas were **different** (e.g., the output includes extra fields like `piiDetected: boolean`), the workflow would need an explicit `workflow.output` step.

---

## Caller Code

### File: `src/platform/plugins/shared/dashboard/server/api/create/create.ts`

```diff
 export async function create(
   requestCtx: RequestHandlerContext,
   dashboardStateSchema: ReturnType<typeof getDashboardStateSchema>,
   createBody: DashboardCreateRequestBody,
   createParams?: DashboardCreateRequestParams,
   isDashboardAppRequest: boolean = false
 ): Promise<DashboardCreateResponseBody> {
-  const { core } = await requestCtx.resolve(['core']);
+  const { core, workflows } = await requestCtx.resolve(['core', 'workflows']);
   const { access_control: accessControl, ...restOfData } = createBody;

   const { attributes: soAttributes, references: soReferences, error: transformInError } =
     transformDashboardIn(restOfData, isDashboardAppRequest);
   if (transformInError) throw Boom.badRequest(`Invalid data. ${transformInError.message}`);

+  // ── Lifecycle hook: pre-create PII reduction ──────────────────────────
+  const workflowsClient = workflows.getWorkflowsClient();
+  const hookResult = await workflowsClient.invokeHook('dashboard.beforeCreate', {
+    title: soAttributes.title ?? '',
+    description: soAttributes.description ?? '',
+  });
+
+  if (hookResult.status === 'failed') {
+    // failurePolicy: 'open' → engine returns status: 'failed' but we could
+    // choose to proceed. For 'closed' triggers, we'd throw here.
+    // Since dashboard.beforeCreate is 'open', this block is optional:
+    logger.warn(`Dashboard pre-create hook failed: ${hookResult.error?.message}`);
+  }
+
+  if (hookResult.status === 'completed') {
+    soAttributes.title = hookResult.output.title;
+    soAttributes.description = hookResult.output.description;
+  }
+  // ────────────────────────────────────────────────────────────────────────

   // ... access control ...

   const savedObject = await core.savedObjects.client.create<DashboardSavedObjectAttributes>(
     DASHBOARD_SAVED_OBJECT_TYPE,
     soAttributes,
     { references: soReferences, /* ... */ }
   );

   return getDashboardCRUResponseBody(savedObject, 'create', dashboardStateSchema, isDashboardAppRequest);
 }
```

### What the dashboard team needs to do

1. **Register the trigger** in `plugin.ts` setup (code above)
2. **Add ~15 lines** in `create.ts` to call `invokeHook` and apply the result
3. **No workflow management** — users subscribe workflows to `dashboard.beforeCreate` via the workflow authoring UI; the engine handles resolution and execution
# Workflow Lifecycle Hooks Proposal

> **Purpose**: Design proposal for extending Kibana's workflow engine to support **event-driven triggers** and **lifecycle hooks** — a unified model that lets teams like Agent Builder, Dashboards, and Cases delegate cross-cutting concerns (guardrails, PII reduction, enrichment) to user-authored or system workflows.

## What Are Lifecycle Hooks?

Today, the workflow engine supports **events** — when something happens in the system (e.g., an alert fires), workflows run in the background. Events are fire-and-forget: the system doesn't wait for the workflow to finish.

This proposal introduces a new concept: **lifecycle hooks**. A lifecycle hook lets you run a workflow **before or after** something happens — synchronously, inline with the operation. The system waits for the workflow to complete, and the workflow can inspect, modify, or reject the operation.

| | Events | Lifecycle Hooks |
|---|---|---|
| **When** | After something happened | Before/after something is about to happen |
| **Execution** | Background (async) | Inline, blocking (sync) |
| **Can modify the operation?** | No — it already happened | Yes — can modify inputs or reject |
| **API** | `emitEvent()` | `invokeHook()` |
| **Example** | `dashboard.created` — run enrichment after save | `dashboard.beforeCreate` — redact PII before save |

Both events and lifecycle hooks are registered the same way and appear identical in the workflow authoring surface. The difference is in how they're invoked and whether they block the caller.

## Proposed Design Decisions

The following decisions are reflected throughout the examples:

| Decision | Summary |
|----------|---------|
| **Lifecycle Hooks** | Blocking (synchronous) workflows are called *lifecycle hooks*. They run inline before an operation completes. |
| **Two APIs** | `emitEvent()` for async fire-and-forget; `invokeHook()` for sync lifecycle participation. Registration uses the same `registerTriggerDefinition()` for both. |
| **Always by-value** | No by-ref mutation. The trigger definition owns the `outputSchema`. Workflows return data via explicit `workflow.output` or implicitly when input and output schemas match. |
| **Trigger-level mode** | The team registering the trigger decides sync vs async — not the workflow author. A `sync` block on the trigger definition marks it as a lifecycle hook. |
| **Naming convention** | `beforeX` / `afterX` = lifecycle hook (sync), `X.created` (past tense) = event (async). Workflow authors subscribe the same way to both; the distinction is transparent. |
| **Error model** | `workflow.fail` = policy denial (intentional). Error codes distinguish policy outcomes from transient failures. |

---

## Core Concepts

### 1. Unified Registration Model

Event-driven triggers and lifecycle hooks follow the **same registration model**. The only distinction is that teams explicitly mark which triggers support synchronous execution via a `sync` block, and they are invoked differently (`emitEvent()` vs `invokeHook()`).

This means workflow authors do not need to think about sync versus async. Both appear the same in the workflow authoring surface and are subscribed to in the same way. For example, subscribing to `dashboard.created` (past tense — event) runs async after creation, while subscribing to `dashboard.beforeCreate` (lifecycle hook) runs sync before creation. Both `beforeX` and `afterX` hooks are synchronous — the naming convention uses past tense verbs (`created`, `completed`) to distinguish async events.

```typescript
// Lifecycle hook — invoked via invokeHook(), blocks the caller
workflowsExtensions.registerTriggerDefinition({
  id: 'dashboard.beforeCreate',
  eventSchema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
  sync: {
    outputSchema: z.object({
      title: z.string(),
      description: z.string().optional(),
    }),
    maxTimeout: '10s',
    failurePolicy: 'open',
  },
});

// Event — invoked via emitEvent(), fire-and-forget
workflowsExtensions.registerTriggerDefinition({
  id: 'dashboard.created',
  eventSchema: z.object({
    dashboardId: z.string(),
    title: z.string(),
  }),
});
```

Both are registered via the same `registerTriggerDefinition()` API. The `sync` block is what distinguishes a lifecycle hook from an event.

### 2. Two APIs

| | `emitEvent()` | `invokeHook()` |
|---|---|---|
| **Execution** | Async — schedules via Task Manager | Sync — executes directly, blocks the caller |
| **Returns** | `void` | `HookResult` (status, outputs, error) |
| **Use case** | "Something happened" (after the fact) | "Something is about to happen — check it" (before the fact) |
| **Payload mutation** | No (caller already moved on) | No (always by-value — caller reads outputs) |
| **Error propagation** | Failures are the workflow's problem | Failures propagate to the caller |

```typescript
// Event — fire-and-forget, caller continues immediately
await workflowsClient.emitEvent('dashboard.created', { dashboardId: saved.id, title });

// Lifecycle hook — blocks until workflow completes, returns typed result
const result = await workflowsClient.invokeHook('dashboard.beforeCreate', {
  title: soAttributes.title,
  description: soAttributes.description,
});
if (result.status === 'failed') {
  throw Boom.badRequest(result.error?.message ?? 'Workflow rejected dashboard creation');
}
soAttributes.title = result.output.title;
soAttributes.description = result.output.description;
```

### 3. Output Model — Always By-Value

The trigger definition owns the success output schema. A lifecycle hook either completes with output matching that schema or fails with a structured error.

**Explicit output** — the workflow uses a `workflow.output` step to return values when the output schema differs from the input:

```yaml
steps:
  - name: anonymise
    type: ai.pii
    with:
      input: "{{ event.message }}"
      # ...
  - name: return_result
    type: workflow.output
    with:
      message: "{{ steps.anonymise.output.anonymised_text }}"
      tokenMap: "{{ steps.anonymise.output.token_map }}"
```

**Implicit output** — when the input and output schemas are the same shape, the workflow does not need a `workflow.output` step. The engine returns the (potentially modified) event fields as the output:

```yaml
# Input: { title, description }  —  Output: { title, description }
# No workflow.output needed — engine returns modified event fields
steps:
  - name: redact_title
    type: data.regexReplace
    with:
      input: "{{ event.title }}"
      patterns:
        - pattern: '\b\d{3}-\d{2}-\d{4}\b'
          replacement: '***-**-****'
```

### 4. Error Handling

Policy denial is represented as **intentional workflow failure** via `workflow.fail`. Error codes distinguish policy outcomes from transient or operational failures:

```yaml
# Policy denial — workflow.fail with a reason code
- name: block_message
  type: workflow.fail
  with:
    message: "Comment blocked: PII detected"
    reason: "pii_detected"           # policy outcome
```

The caller receives:

```typescript
const result = await workflowsClient.invokeHook('cases.beforeComment', commentEvent);
if (result.status === 'failed') {
  // result.error.reason === 'pii_detected' → policy denial
  // result.error.reason === 'timeout' → operational failure
  // result.error.reason === 'execution_error' → transient failure
}
```

**Fail-open vs fail-closed** is configured per trigger at registration time:

| Policy | Behavior | Use case |
|--------|----------|----------|
| `open` (default) | Timeout/error → caller proceeds as if no workflow ran | Dashboard save, most CRUD |
| `closed` | Timeout/error → caller receives the error, must handle it | Security guardrails, compliance |

### 5. Multiple Workflows on the Same Hook

When multiple workflows subscribe to the same lifecycle hook, the engine runs them **sequentially** in priority order. Each workflow receives the **same original input**, and their outputs are **merged** into a single `HookResult`:

```
invokeHook('dashboard.beforeCreate', { title, description })
    │
    ├── Workflow A (priority: 1) → output: { title: "Redacted A", description }
    ├── Workflow B (priority: 2) → output: { title: "Redacted B", description }
    │
    └── Merged HookResult.output: { title: "Redacted B", description }
         (last writer wins per field, ordered by priority)
```

- Each workflow gets the original event as input (not the previous workflow's output)
- Outputs are merged — later workflows (higher priority number) override earlier ones per field
- If any workflow calls `workflow.fail`, execution short-circuits and the failure is returned
- Priority is set by the workflow author at subscription time, giving users control over execution order

**Per-entity filtering** — workflows can use the `on.condition` clause to filter which events they handle. For example, an Agent Builder guardrail that only runs for a specific agent:

```yaml
triggers:
  - type: agent-builder.beforeChatRound
    on:
      condition: "event.agentId == 'security-analyst-agent'"
```

This lets different agents run different workflows on the same hook. A generic guardrail (no condition) runs for all agents, while agent-specific workflows run only when the condition matches.

### 6. Trigger Registration API

```typescript
interface TriggerDefinitionConfig {
  id: string;
  eventSchema: ZodSchema;

  // If present, this trigger is a lifecycle hook (sync)
  // If absent, this trigger is an event (async)
  sync?: {
    outputSchema: ZodSchema;               // required — the contract for hook output
    maxTimeout: string;                     // e.g. '10s' — max allowed workflow timeout
    failurePolicy: 'open' | 'closed';      // default: 'open'
    maxConcurrentWorkflows?: number;        // default: 5
  };
}
```

### 7. `HookResult` Type

```typescript
interface HookResult {
  status: 'completed' | 'failed' | 'timeout';
  output: Record<string, unknown>;         // matches trigger's outputSchema
  error?: {
    message: string;
    reason?: string;                       // 'pii_detected', 'guardrail_violation', 'timeout', etc.
  };
}
```

---

## Architecture

### Lifecycle Hook Flow (sync)

```
  Caller (e.g. Dashboard)                    Workflow Engine
  =======================                    ==============

  1. Build event DTO
     { title, description }
                    ─── invokeHook('dashboard.beforeCreate', event) ───>
                                                            2. Resolve trigger definition
                                                               → sync block present → hook mode
                                                            3. Resolve subscribed workflows
                                                               → filter by on.condition
                                                               → order by priority
                                                            4. For each eligible workflow (sequentially):
                                                               a. Check circuit breaker
                                                               b. executeWorkflow(originalEvent)
                                                                  timeout = min(wf.timeout, trigger.maxTimeout)
                                                               c. Collect output
                                                               d. If workflow.fail → short-circuit, return error
                                                            5. Merge outputs from all workflows
                    <── HookResult { status, output, error } ──
  6. Check result:
     - failed → throw / reject operation
     - completed → use merged output fields
  7. Continue with save
```

### Event Flow (async) — unchanged from today

```
  Caller (e.g. Alerting)                     Workflow Engine
  ======================                     ==============

  1. Something happens
                    ─── emitEvent('alert.created', payload) ───>
                                                            2. Resolve subscribed workflows
                                                            3. scheduleWorkflow (Task Manager)
                    <── void ──
  3. Continue immediately                                   4. Workflow runs async via TM
```

---

## Lifecycle Hook Guardrails

Lifecycle hooks block HTTP requests. A broken or slow workflow can degrade the experience for all users. The following guardrails ensure hooks are safe by default:

| Guardrail | Description | New or existing? |
|-----------|-------------|------------------|
| **Hard timeout** | Platform cap (30s default) + trigger-level cap (`maxTimeout`). Effective timeout = `min(workflow.timeout, trigger.maxTimeout, PLATFORM_MAX)` | Existing infra, new sync cap |
| **Circuit breaker** | Auto-suspend workflows that fail repeatedly (5 consecutive or 50% in rolling window). Cooldown → half-open → re-evaluate. | New |
| **Fail-open/closed** | Configurable per trigger. Most teams want fail-open (broken workflow doesn't break the feature). Security teams want fail-closed. | New |
| **Save-time validation** | Warn on dangerous patterns in hook workflows: no `wait` steps, no `workflow.executeAsync`, `foreach` capped at 100 iterations, max 20 steps. | New |
| **Chain depth limit** | Sync chain depth capped at 2 (existing `EventChainContext` infra, tighter limit for hooks). Prevents hook → hook → hook cascade. | Existing infra, tighter limit |
| **Concurrency limit** | Max N workflows per hook invocation (default 5, configurable via `maxConcurrentWorkflows`). Sequential execution ordered by priority; first `workflow.fail` short-circuits the rest. Outputs are merged. | New |
| **Resource limits** | Step output size limits, Layer 1 pre-emptive I/O limits, Layer 2 generic output check — all inherited from existing engine infrastructure. | Existing |
| **Admin controls** | Global kill switch (`workflows.hooks.enabled: false`), per-trigger disable, per-workflow disable, observability dashboard. | New |

See [`archive/08-sync-workflow-guardrails.md`](./archive/08-sync-workflow-guardrails.md) for the full guardrails proposal with detailed architecture.

---

## Legend

Throughout the examples, comments indicate what exists today vs. what is proposed:

- `[EXISTS]` — This syntax/feature works today in the workflow engine
- `[PROPOSED]` — This syntax/feature does not exist yet and is part of this design proposal
- `[PROPOSED STEP]` — A new step type that would need to be implemented

---

## Team Integration Guides

Each guide contains trigger registrations, workflow YAML examples, and caller code for a specific team:

| Guide | Lifecycle hooks | Key patterns |
|-------|----------------|--------------|
| [**Agent Builder**](./agent-builder.md) | `beforeChatRound` (guardrails), `beforeInference` / `afterInference` (PII anonymization) | Trigger output chaining, guardrail with `workflow.fail`, migration from `BeforeAgentWorkflowOutput` |
| [**Dashboards**](./dashboards.md) | `beforeCreate` (PII reduction) | Implicit output (input = output schema), `data.regexReplace` |
| [**Cases**](./cases.md) | `beforeCreate`, `beforeComment` (PII guardrail) | `ai.guardrail` step, `workflow.fail` for blocking |

---

## Archive

Previous iteration files (numbered examples, discussion docs, integration guide) are preserved in [`archive/`](./archive/) for historical reference.
