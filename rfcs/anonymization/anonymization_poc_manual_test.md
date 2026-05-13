# Workflow-Driven Anonymization POC — Manual Test Guide

This document describes how to verify the workflow-driven LLM anonymization POC end-to-end. Follow each scenario in order; each builds on the previous one.

## Prerequisites

- Branch: `workflow-and-inference-lifecycle-hooks`
- Bootstrap: `yarn kbn bootstrap`
- An LLM connector configured in Kibana (OpenAI or Bedrock; any connector that routes through the inference plugin works)
- `xpack.encryptedSavedObjects.encryptionKey` set in `kibana.yml` (required for cross-restart token determinism — see §2)

## 1. Verify the circular dependency is gone

Before starting Kibana, confirm the plugin graph is valid:

```bash
node scripts/type_check --project x-pack/platform/plugins/shared/inference/tsconfig.json
node scripts/type_check --project src/platform/plugins/shared/workflows_extensions/tsconfig.json
```

Both must exit 0. If you see `inference -> workflowsExtensions -> inference` in any error, the fix in `kibana.jsonc` was not applied correctly.

## 2. Configuration

Add the following to your `kibana.yml` (or `config/kibana.dev.yml`):

```yaml
# Enable the new workflow-driven anonymization path (default: false)
xpack.inference.anonymization.enabled: true

# Fail-closed: reject the chatComplete call if the anonymization workflow fails
xpack.inference.anonymization.failureMode: block

# Required for cross-restart token determinism (HMAC salt derivation)
xpack.encryptedSavedObjects.encryptionKey: "a-32-char-or-longer-secret-key!!"
```

> **Important**: without `encryptedSavedObjects.encryptionKey`, Kibana generates a random key on each restart and tokens will not be consistent across restarts. Any stable value of 32+ characters works for local testing.

## 3. Seed the default anonymization workflows

The two default workflows ship as YAML in `x-pack/platform/packages/shared/ai-infra/default_anonymization_workflows/src/`. They need to be loaded into the workflow engine before any hook fires.

**Option A — workflow UI import (recommended for demo):**
1. Start Kibana and navigate to **Management → Workflows**.
2. Click **Create workflow → Import from YAML**.
    3. Paste the contents of `before_prompt_anonymization.yaml` and save as "Default LLM PII Anonymization".
   4. Repeat with `after_completion_deanonymization.yaml`, saved as "Default LLM PII De-anonymization".
5. Enable both workflows.

**Option B — programmatic (if the workflow UI import does not yet exist):**
Use the workflows API directly:
```bash
# substitute your Kibana URL and credentials
curl -X POST "http://localhost:5601/api/workflows" \
  -H "kbn-xsrf: true" -H "Content-Type: application/json" \
  -u elastic:changeme \
  -d @x-pack/platform/packages/shared/ai-infra/default_anonymization_workflows/src/before_prompt_anonymization.yaml
```

## 4. Scenario A — Happy path (single turn)

**Goal:** verify that PII in the user message is tokenized before reaching the connector and restored in the response.

**Steps:**
1. Start Kibana with the config from §2.
2. Open **Agent Builder** and open (or create) an agent wired to an LLM connector.
3. Start a new conversation and send:
   ```
   Summarize this alert: source IP is 192.168.1.50 and the reporter is admin@example.com
   ```
4. Open the Kibana server log (or the connector debug log if enabled) and find the outbound connector request.

**Expected in connector log:**
- The `messages` array must **not** contain `192.168.1.50` or `admin@example.com`.
- Instead you should see tokens like `IP_a1b2c3d4...` and `EMAIL_e5f6...` in their place.

**Expected in the chat UI:**
- The rendered response must show `192.168.1.50` and `admin@example.com` — the originals restored by `transform.pii_restore`.

**What to check if it doesn't work:**
- Confirm `xpack.inference.anonymization.enabled: true` is in your config.
- Confirm both workflows are enabled in the workflow UI.
- Check the Kibana log for `[inference][anonymization]` log lines — any error there will explain why the hook path was skipped.

## 5. Scenario B — Cross-turn token determinism

**Goal:** verify that the same PII value produces the same token across multiple turns within one conversation.

**Steps:**
1. After Scenario A, in the **same conversation**, send a follow-up:
   ```
   What did the user from that IP do next?
   ```
2. In the connector log for the second turn, find the token used for `192.168.1.50`.

**Expected:**
- The token for `192.168.1.50` in turn 2 is **identical** to the token used in turn 1 (e.g. both are `IP_a1b2c3d4...`).

This works because the HMAC salt is derived from `HMAC(encryptionKey, conversationId)` — deterministic regardless of which Kibana node handles the request.

**If the tokens differ between turns:**
- Check that `xpack.encryptedSavedObjects.encryptionKey` is set to a stable value (not auto-generated).
- Check that Agent Builder is threading `conversationId` into `metadata.anonymization.sessionId` (see `execution_runner.ts`).

## 6. Scenario C — Fail-closed behavior

**Goal:** verify that a broken anonymization workflow rejects the `chatComplete` call rather than silently sending raw PII.

**Steps:**
1. In the workflow UI, open "Default LLM PII Anonymization" and introduce a deliberate syntax error in the YAML (e.g. reference a non-existent step type or add an invalid regex like `"[invalid"`).
2. Save the workflow.
3. Send a new message in Agent Builder.

**Expected:**
- The chat UI shows an error: `InferenceAnonymizationUnavailableError` (or a user-facing version of it).
- **No** outbound request reaches the connector (verify via connector log — no new entry should appear).
- The Kibana server log contains a `warn` or `error` line for the anonymization hook failure.

**Restore:** fix the YAML and re-enable the workflow before running Scenario D.

## 7. Scenario D — Regression (flag off, existing path unchanged)

**Goal:** verify that disabling the feature flag restores the pre-POC behavior exactly.

**Steps:**
1. Stop Kibana.
2. Remove or comment out `xpack.inference.anonymization.enabled: true` from `kibana.yml` (or set it to `false`).
3. Start Kibana.
4. Send the same message as Scenario A.

**Expected:**
- The connector receives the raw prompt (no tokenization) — exactly as it did before this branch.
- The existing `prepareAnonymization`/`deanonymizeMessage` path runs (observable in server logs if debug logging is on for the inference plugin).
- The chat response is normal — no tokens visible to the user.

**Run the existing test suite to confirm no regression:**
```bash
node scripts/jest x-pack/platform/plugins/shared/inference/server/chat_complete
```
All tests must pass without modification.

## 8. Scenario E — Multi-node / restart determinism (optional)

**Goal:** verify that tokens are stable across Kibana restarts because the salt is derived from the stable encryption key, not process-local state.

**Steps:**
1. Complete Scenario A and note the token for `192.168.1.50` (e.g. `IP_a1b2c3d4`).
2. Restart Kibana (do not change `encryptedSavedObjects.encryptionKey`).
3. In a **new conversation** with the same conversation ID (if your test harness supports re-using a conversation ID), send the same message.

**Expected:** `192.168.1.50` produces `IP_a1b2c3d4` again.

> **Note:** In practice, Agent Builder creates a new `conversationId` for each new conversation, so this scenario requires either re-using a known `conversationId` via the API or a small instrumentation tweak. It validates the HMAC-based design rather than a session-store design.

## 9. Troubleshooting reference

| Symptom | Likely cause | Fix |
|---|---|---|
| Kibana fails to start with `inference -> workflowsExtensions -> inference` | `workflowsExtensions` still in `inference/kibana.jsonc` `optionalPlugins` | Remove it — see circular dep fix |
| Connector receives raw PII despite flag being `true` | Workflows not seeded / not enabled | Seed and enable both workflows in the workflow UI |
| `InferenceAnonymizationUnavailableError` on every message | Workflow has a bug | Check workflow YAML; use `failureMode: allow_unsafe` temporarily to keep the service up while debugging |
| Tokens differ between turns | No stable `encryptionKey` or `conversationId` not threaded | Set a stable `encryptionKey`; verify `execution_runner.ts` passes `conversationId` |
| Response shows raw tokens like `IP_a1b2c3d4` | `after_completion_deanonymization` workflow not enabled | Enable the after-completion workflow in the UI |
| Type check errors in inference plugin | Mocks not updated | Add `registerAnonymizationHookInvoker: jest.fn()` to `mocks.ts` |

## 10. Verification commands

Run these before declaring the POC complete:

```bash
# Type checks
node scripts/type_check --project x-pack/platform/plugins/shared/inference/tsconfig.json
node scripts/type_check --project src/platform/plugins/shared/workflows_extensions/tsconfig.json
node scripts/type_check --project x-pack/platform/plugins/shared/agent_builder/tsconfig.json

# Unit tests (new path and regression)
node scripts/jest x-pack/platform/plugins/shared/inference/server/chat_complete
node scripts/jest x-pack/platform/plugins/shared/inference/server/anonymization
node scripts/jest src/platform/plugins/shared/workflows_extensions/server/steps
node scripts/jest src/platform/plugins/shared/workflows_extensions/server/trigger_registry

# Change validation
node scripts/check_changes.ts
```