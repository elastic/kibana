# Workflow-Driven Anonymization Phase 2 — Manual Test Guide

This document describes how to verify the Phase 2 changes end-to-end. Phase 2 replaces the Phase 1 in-memory TypeScript handlers with persisted YAML workflows that execute inline through the workflow engine. The key differences from the Phase 1 POC are:

- Default workflows are now **seeded automatically** on startup.
- Anonymization is activated per-space by **enabling the seeded workflow** in Workflow Management — no separate UI setting or ID list required.
- The YAML stored in the index is the actual runtime source of truth — `executeWorkflowSync` runs it step by step.
- Legacy `ai:anonymizationSettings` rules are imported into the seeded workflow on first run.

Follow each scenario in order; each builds on the previous one.

---

## Prerequisites

- Branch: `workflow-and-inference-lifecycle-hooks`
- Bootstrap: `yarn kbn bootstrap`
- An LLM connector configured in Kibana (any connector that routes through the inference plugin)
- `xpack.encryptedSavedObjects.encryptionKey` set in `kibana.yml`

---

## 1. Configuration

Add the following to `kibana.yml` (or `config/kibana.dev.yml`):

```yaml
# Opt in to the workflow-driven hook path (required — without this the legacy path runs unchanged)
xpack.inference.anonymization.experimental_workflow_driven: true

# Opt in to the AOP-style around hook (required — without this the before/after path runs)
xpack.inference.anonymization.experimental_around_hook: true

# Required for AI connectors and for HMAC salt stability across restarts
xpack.encryptedSavedObjects.encryptionKey: "a-32-char-or-longer-secret-key!!"
```

`failureMode` defaults to `block` (fail-closed) — no need to set it explicitly unless you want `allow_unsafe`.

---

## 2. Scenario A — Verify default workflow seeding

**Goal:** confirm that a single disabled workflow appears in the index on a fresh startup without any manual import.

**Steps:**

1. Start Kibana with the config from §1.
2. Watch the server log for:
   ```
   [seedDefaultWorkflows] Seeded workflow "default-pii-anonymization-around-completion"
   ```
   On subsequent restarts you should see `already exists — skipping` instead.
3. Open **Management → Workflows**.
4. Confirm that one workflow appears:
   - **Default PII Anonymization (around completion)** — status: disabled

**Expected:** the workflow exists and is disabled (the feature is off until the admin explicitly enables it).

**Also verify via the API:**
```bash
curl -s "http://localhost:5601/api/workflows" \
  -H "kbn-xsrf: true" \
  -H "elastic-api-version: 2023-10-31" \
  -u elastic:changeme \
  | jq '.results[] | {id, name, enabled}'
```

---

## 3. Scenario B — Activate anonymization by enabling the workflow

**Goal:** verify that the feature only runs when the admin enables the workflow, and is a complete pass-through when it is disabled.

### 3a. Verify pass-through when the workflow is disabled (default state)

1. Start a conversation in Agent Builder and send:
   ```
   Alert: source IP is 10.0.0.1 and the reporter is ops@example.com
   ```
2. Check the connector log.

**Expected:** connector receives the raw message — `10.0.0.1` and `ops@example.com` appear verbatim. The workflow is disabled, so `invokeHook` finds no enabled workflows and returns `pass_through` immediately.

### 3b. Enable the workflow

1. In **Management → Workflows**, open **Default PII Anonymization (around completion)** and enable it.

No other configuration is needed — the inference hook automatically discovers enabled workflows subscribed to the trigger for the current space.

### 3c. Verify anonymization is now active

1. Send the same message as 3a.
2. Check the connector log.

**Expected:**
- Connector receives tokens, not raw values — e.g. `IP_a1b2c3...` and `EMAIL_d4e5...` in place of `10.0.0.1` and `ops@example.com`.
- The system prompt sent to the connector includes an appended `[Anonymization context]` block listing the entity types present (e.g. `IP, EMAIL`). This tells the LLM not to interpret or reveal the tokens.
- The chat UI shows the restored originals.

**Verify YAML execution via log:**
The server log should contain `[executeWorkflowSync]` entries for each step and a `[hook-anon] invoking inference.aroundCompletion` entry — confirming the YAML around hook path is running, not any in-memory handlers.

---

## 4. Scenario C — YAML workflow executes step by step (`ai.pii` + `call_site.proceed` + `workflow.output`)

**Goal:** verify that `executeWorkflowSync` correctly evaluates the `if:` condition, suspends/resumes at `call_site.proceed`, and produces the de-anonymized response.

### 4a. Verify system prompt anonymization (the `if:` guard)

The around-completion workflow has:
```yaml
- name: anonymize_system
  type: ai.pii
  if: 'event.system'
```

Note: `evaluateCondition` in `executeWorkflowSync` wraps the `if:` value in `{{ }}` before evaluating it, so the bare expression `event.system` is correct — writing `{{ event.system }}` would produce `{{ {{ event.system }} }}` and always fail.

A call with no system prompt must not fail even though `event.system` is `null`.

1. Create a minimal agent with **no system prompt** configured.
2. Send a message containing an IP address.

**Expected:** no error; the `anonymize_system` step is skipped (the `if:` guard evaluates to falsy); `anonymize_messages` still runs and tokenizes the IP.

### 4b. Verify both system and messages are anonymized

1. Edit the agent to add a system prompt that contains PII, e.g.:
   ```
   You assist users of example.com. Escalate to admin@corp.com if needed.
   ```
2. Send a message with a different PII value:
   ```
   Why is 172.16.0.10 unreachable?
   ```
3. Check the connector log.

**Expected:** both the system prompt (`admin@corp.com`) and the message (`172.16.0.10`) appear tokenized in the outbound connector request. The system prompt also ends with the `[Anonymization context]` instruction block, listing both `IP` and `EMAIL` as entity types present.

---

## 5. Scenario D — Custom regex via YAML editing

**Goal:** verify that an admin can extend the default workflow with a custom regex pattern and that `executeWorkflowSync` runs the updated YAML.

**Steps:**

1. In **Management → Workflows**, open "Default PII Anonymization (around completion)".
2. Add a custom pattern to the `anonymize_messages` step:
   ```yaml
   customPatterns:
     - pattern: 'EMP-\d{5}'
       entityClass: EMPLOYEE_ID
   ```
3. Save the workflow.
4. Send a message:
   ```
   Employee EMP-42317 filed the incident from 192.168.0.5
   ```
5. Check the connector log.

**Expected:** the connector receives `EMPLOYEE_ID_...` in place of `EMP-42317` and `IP_...` in place of `192.168.0.5`. The custom pattern runs because `executeWorkflowSync` reads the live YAML from the index on each invocation.

---

## 6. Scenario E — Legacy `ai:anonymizationSettings` migration

**Goal:** verify that regex rules from the Observability AI Assistant's `ai:anonymizationSettings` UI setting (Stack Management → Advanced Settings → Observability → Anonymization Settings) are imported into the seeded workflow on first startup.

**Steps:**

1. Stop Kibana.
2. Using Dev Tools, write a legacy setting:
   ```bash
   curl -X POST "http://localhost:5601/api/saved_objects/config/8.0.0" \
     -H "kbn-xsrf: true" -H "Content-Type: application/json" \
     -u elastic:changeme \
     -d '{
       "attributes": {
         "ai:anonymizationSettings": "{\"rules\":[{\"type\":\"RegExp\",\"pattern\":\"TICKET-[0-9]+\",\"entityClass\":\"TICKET_ID\",\"enabled\":true},{\"type\":\"NER\",\"modelId\":\".elser-2\",\"enabled\":true}]}"
       }
     }'
   ```
3. Reset the migration flag so it re-runs on the next start. The cleanest way is to delete the
   entire `.workflows-workflows` index (this also re-triggers seeding):
   ```bash
   curl -X DELETE "http://localhost:9200/.workflows-workflows-000001" \
     -u elastic:changeme \
     -H "X-elastic-product-origin: kibana"
   ```
   > **Note:** Do not delete the workflow via the Kibana API — that performs a soft-delete which
   > the seeding and migration both respect, leaving the workflow invisible in the UI.
4. Start Kibana.
5. Watch the server log for migration output:
   ```
   [migrateAnonymizationSettings] Migrated 1 regex rule(s) into "default-pii-anonymization-around-completion"
   ```
6. Open the seeded "Default PII Anonymization (around completion)" workflow in the UI and inspect the YAML.

**Expected:**
- The `ai.pii` step for messages contains `TICKET-[0-9]+` in `customPatterns`.
- The NER rule is absent (dropped with a log warning).
- A second restart does **not** re-import (idempotency marker set).

---

## 7. Scenario F — Fail-closed when YAML workflow fails

**Goal:** verify that a broken YAML workflow rejects the `chatComplete` call under `failureMode: block`.

**Steps:**

1. Open "Default PII Anonymization (around completion)" in the workflow editor.
2. Introduce a syntax error — reference a non-existent step type:
   ```yaml
   - name: broken_step
     type: ai.does_not_exist
     with:
       input: '{{ event.messages }}'
   ```
3. Save the workflow.
4. Send a message in Agent Builder.

**Expected:**
- The chat UI shows an error response (`InferenceAnonymizationUnavailableError` or a user-facing equivalent).
- No outbound connector request — the log shows no new entry from the connector.
- Kibana server log contains a `warn` or `error` line referencing the hook failure.

**Restore:** fix the YAML or remove the broken step before continuing.

---

## 8. Scenario G — Multi-workflow chaining

**Goal:** verify that two around workflows subscribed to the same trigger both run and both contribute to anonymization.

**Steps:**

1. Clone the around-completion workflow in the UI and rename it "Custom Org Patterns".
2. Replace the pre-proceed `ai.pii` steps in the clone with only:
   ```yaml
   - name: anonymize_custom
     type: ai.pii
     with:
       sessionId: '{{ event.sessionId }}'
       input: '${{ event.messages }}'
       customPatterns:
         - pattern: 'PROJ-[0-9]+'
           entityClass: PROJECT_ID
   ```
3. Enable the cloned workflow (it should now join the default one — both enabled for the trigger in this space).
4. Send:
   ```
   Alert from 10.0.0.2 on project PROJ-9981 filed by dev@example.com
   ```
5. Check the connector log.

**Expected:** all three values are tokenized — `IP_...`, `PROJECT_ID_...`, `EMAIL_...` — confirming both workflows ran (each suspending at `call_site.proceed` and running their own pre/post-proceed steps) and each contributed to the shared session token map.

---

## 9. Scenario H — Regression (experimental flag off)

**Goal:** verify that the old pre-Phase-2 behavior is fully restored when the experimental flag is `false`.

**Steps:**

1. Stop Kibana.
2. Remove or comment out `xpack.inference.anonymization.experimental_workflow_driven: true` from `kibana.yml`.
3. Start Kibana.
4. Send the same PII-containing message as Scenario B.

**Expected:** the connector receives the raw prompt — no tokenization, no hook overhead. The existing pre-Phase-2 anonymization path (`prepareAnonymization`) runs instead if it was previously enabled; otherwise the raw message goes through. Either way, no `[executeWorkflowSync]` log entries appear.

---

## 10. Scenario I — Using `ai.pii` outside the inference layer

**Goal:** understand what the `ai.pii` (and `transform.pii_restore`) step needs to function, and how to use it in a workflow that is triggered by something other than `inference.beforeCompletion`.

### Background — what the step actually needs

The `ai.pii` step does **not** receive a salt or a token map through its YAML `with:` block. Instead it looks them up at runtime from the session capabilities cache, using the `sessionId` field you pass in the YAML. The inference plugin populates that cache entry before it calls `invokeHook`, and clears it afterwards.

This means the step throws an error — `No AnonymizationContext found for session "..."` — if no capabilities have been registered for the session ID at execution time.

There are two distinct ways the step can be used outside the standard inference chat path.

---

### Scenario I1 — Piggyback on `inference.aroundCompletion` with a custom workflow

This is the simplest path. The `inference.aroundCompletion` trigger is already set up to provide the `AnonymizationContext` capability. You can subscribe **any** custom workflow to that trigger and use `ai.pii` freely.

**Steps:**

1. In **Management → Workflows**, create a new workflow (or clone the default one).
2. Subscribe it to `inference.aroundCompletion`.
3. Write a YAML body that uses `ai.pii` with only the custom patterns you care about and includes a `call_site.proceed` step:
   ```yaml
   version: '1'
   name: Custom ticket anonymization
   triggers:
     - type: inference.aroundCompletion
   steps:
     - name: mask_tickets
       type: ai.pii
       with:
         sessionId: '{{ event.sessionId }}'
         input: '${{ event.messages }}'
         customPatterns:
           - pattern: 'TICKET-\d+'
             entityClass: TICKET_ID
     - name: proceed
       type: call_site.proceed
       with:
         sessionId: '{{ event.sessionId }}'
         messages: '${{ steps.mask_tickets.output.output }}'
     - name: restore
       type: transform.pii_restore
       with:
         sessionId: '{{ event.sessionId }}'
         input: '{{ steps.proceed.output.response }}'
     - name: emit_output
       type: workflow.output
       with:
         response: '${{ steps.restore.output.output }}'
   ```
4. Enable the workflow.
5. Send a message containing `TICKET-12345` through Agent Builder.

**Expected:** the connector receives `TICKET_ID_<hex32>` in place of `TICKET-12345`. The response shows the real value restored. The token is stable within the session — the same ticket number always produces the same token.

---

### Scenario I2 — Using `ai.pii` from your own plugin's sync trigger

If you want to apply PII anonymisation in a workflow context that has nothing to do with inference — for example, scrubbing an alert payload before writing it to a case — you need to:

1. **Register a sync trigger** with `inlineExecution: true` in your plugin's `setup()`.
2. **Construct an `AnonymizationContext`** and pass it as a capability when you call `invokeHook`.
3. **Create a YAML workflow** subscribed to your trigger that uses `ai.pii`.

The `AnonymizationContext` capability object must satisfy this shape (structural, no import required):

```typescript
interface AnonymizationContextHandle {
  readonly salt: string;          // a stable secret string — use HMAC-derived salt for cross-restart consistency
  readonly tokenMap: Map<string, { original: string; entityClass: string }>;
}
```

**Minimal plugin wiring:**

```typescript
// In setup() — register your trigger
workflowsExtensions.registerTriggerDefinition({
  id: 'my_plugin.process_alert',
  eventSchema: myAlertSchema,
  sync: {
    outputSchema: z.object({ sanitizedPayload: z.string() }).passthrough(),
    maxTimeout: '10s',
    failurePolicy: 'open',   // or 'closed' to fail safe
    chained: true,
    inlineExecution: true,   // required — opts the trigger in to the YAML execution path
  },
});

// In request handling — invoke the hook
const sessionId = `alert-${alertId}`;
const tokenMap = new Map();
const capabilities = {
  anonymizationContext: {
    salt: derivedSaltFromEncryptedKey,  // derive deterministically so restore works later
    tokenMap,
  },
};
const result = await workflowsClient.invokeHook(
  'my_plugin.process_alert',
  { sessionId, payload: alertText },
  capabilities
);
// result.output contains the anonymized payload
// tokenMap now contains all replacements; persist it if you need to restore later
```

**Expected behaviour:** `ai.pii` steps in any enabled workflow subscribed to `my_plugin.process_alert` will find the `AnonymizationContext` under `sessionId` and apply their regex rules.

---

### Scenario I3 — Understanding the token format

Tokens produced by `ai.pii` follow this format: `<ENTITY_CLASS>_<32 hex chars>`

Examples:
- `IP_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4`
- `EMAIL_f7e8d9c0b1a2f7e8d9c0b1a2f7e8d9c0`
- `TICKET_ID_0011223344556677001122334455667788`

The 32-character hex suffix is an HMAC-SHA256 of the original value, keyed by the salt.

To verify a token was produced correctly for a given value:

```bash
node -e "
const { createHmac } = require('crypto');
const salt = '<your-salt>';
const entityClass = 'IP';
const value = '10.0.0.1';
const input = entityClass.length + ':' + entityClass + '::' + value;
const hash = createHmac('sha256', salt).update(input).digest('hex').slice(0, 32);
console.log(entityClass + '_' + hash);
"
```

---

### Current limitation — background (async) workflows

`ai.pii` cannot be used in background workflows that run through Task Manager (triggered via `emitEvent`). The session capability cache is populated only during a synchronous `invokeHook` call; background workflows run in a separate process context where the cache is always empty and the step will throw. If you need PII scrubbing in an async workflow, the workaround today is to perform the anonymisation in a sync pre-processing step (via your own `invokeHook`) and pass the already-anonymised payload as the event to `emitEvent`.

---

## 11. Troubleshooting reference

| Symptom | Likely cause | Fix |
|---|---|---|
| Seeding log lines never appear | `inferenceWorkflows` optional dep not wired | Confirm `workflows_management/kibana.jsonc` lists `inferenceWorkflows` in `optionalPlugins` |
| Seeded workflow appears but anonymization passes through | Workflow is disabled | Enable it in **Management → Workflows** |
| Workflow enabled but still pass-through | `experimental_workflow_driven` or `experimental_around_hook` flag not set | Add both `xpack.inference.anonymization.experimental_workflow_driven: true` and `xpack.inference.anonymization.experimental_around_hook: true` to `kibana.yml` and restart |
| `[executeWorkflowSync] No step definition found for type "ai.pii"` | `inferenceWorkflows` plugin not loaded | Confirm `xpack.inferenceWorkflows.enabled` is not `false` in config |
| Response shows raw tokens (`IP_a1b2c3...`) visible to user | The `transform.pii_restore` step is missing or the `call_site.proceed` step is misconfigured | Inspect the workflow YAML — ensure `restore` step and `emit_output` step are present after `proceed` |
| `[executeWorkflowSync] Workflow timed out` | A step exceeded 30s | Simplify the workflow or increase the trigger's `maxTimeout` |
| Legacy migration ran but no `customPatterns` appear | Legacy setting was empty or contained only NER rules | Check the migration log for `Imported 0 regex rule(s)` |
| Legacy migration re-runs on every restart | Migration flag not persisted | Check that the seeded workflow document has `migratedLegacySettings: true` in its metadata |
| `InferenceAnonymizationUnavailableError` on every message | Workflow YAML has a bug | Check Kibana log for the specific step error; set `xpack.inference.anonymization.failureMode: allow_unsafe` temporarily while debugging |

---

## 12. Verification commands

Run before marking Phase 2 complete:

```bash
# Type checks across affected plugins
node scripts/type_check --project src/platform/plugins/shared/workflows_execution_engine/tsconfig.json
node scripts/type_check --project src/platform/plugins/shared/workflows_extensions/tsconfig.json
node scripts/type_check --project src/platform/plugins/shared/workflows_management/tsconfig.json
node scripts/type_check --project x-pack/platform/plugins/shared/inference/tsconfig.json
node scripts/type_check --project x-pack/platform/plugins/shared/inference_workflows/tsconfig.json

# Unit tests
node scripts/jest src/platform/plugins/shared/workflows_execution_engine/server/execution_functions
node scripts/jest src/platform/plugins/shared/workflows_management/server/client
node scripts/jest src/platform/plugins/shared/workflows_management/server/seeding
node scripts/jest x-pack/platform/plugins/shared/inference/server/chat_complete

# Change validation
node scripts/check_changes.ts
```
