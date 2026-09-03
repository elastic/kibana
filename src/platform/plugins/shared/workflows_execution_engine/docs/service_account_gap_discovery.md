# Service account gap discovery

This document records the boundary probes run from the Workflows integration on September 3,
2026. The purpose is to distinguish active work from gaps that currently have no owner.

## Proven end to end

- A saved workflow can bind and rebind a UIAM organization service account through
  `settings.run_as`; a run after rebinding uses the replacement identity.
- The Workflows browser can select a named service account, persist `settings.run_as`, start the
  saved workflow, render the account name and id, and return the seeded Elasticsearch document.
- Manual and scheduled executions exchange short-lived credentials inside Kibana Security.
- `elasticsearch.request` can query a real index with the exchanged service-account identity.
- `ai.agent` can create and execute an Agent Builder conversation with the scoped
  service-account request.
- Execution APIs preserve the distinction between the triggering user (`executedBy`) and the
  service account (`effectiveIdentity`).
- An editor can run an admin-bound workflow. This matches the stated MVP model where binding is
  admin-only and execution follows the Workflows space privilege, but it does not resolve the
  longer-term per-account use policy.

The repeatable probes are under
[`scout_uiam_local`](../../workflows_management/test/scout_uiam_local/).

## Automated result matrix

Results from the UIAM `git-810cfd82cc58` and ES Serverless `git-9216c1af6e3d` stack:

| Workflow or scenario | How it was tested | Expected outcome | Observed outcome |
| --- | --- | --- | --- |
| UI bind and save | Selected the named account in **Run as** and saved in the browser | Saved YAML contains the selected account id | **Passed** |
| Manual Elasticsearch run | Ran the UI-bound workflow and read the execution API | Completed with the seeded document, triggering admin, and bound account | **Passed** |
| Execution identity UI | Opened a completed execution in the browser | Account name and id are visible | **Passed** |
| Scheduled Elasticsearch run | Waited for the first scheduled execution and read its output | Completed with the seeded document and bound account | **Passed** |
| Rebound Elasticsearch run | Changed account A to B and ran the workflow | Account B is effective and account A is not | **Passed** |
| Agent Builder run | Ran `ai.agent` against the LLM proxy | Mocked answer and bound account are present | **Passed** |
| Agent Builder conversation access | Read the generated conversation as the triggering admin | Product contract must define visibility | **Contract unclear:** returned `404` |
| Wait and resume | Compared `_security/_authenticate` before and after `waitForInput` | Both requests use the bound account | **Failed:** resumed request used `TaskManager: workflow:resume` |
| Admin authorization | Created/listed an account, bound it, and ran as admin | Required operations are allowed | **Passed** |
| Editor authorization | Listed/rebound/ran as editor | List and rebind return `403`, never `500`; allowed run works | **Failed:** list returned `403` and run passed, but rebind returned `500` |

## Probe matrix

### Authorization

- **View:** Admin and editor can read the bound workflow (`200`). No gap.
- **Run:** Admin and editor can run the bound workflow (`200`), and both executions use the bound
  service account. The absence of a separate per-account use check is an acknowledged post-MVP
  policy gap.
- **Edit metadata:** Editor can update non-executable metadata (`200`). No gap.
- **Edit executable YAML:** Editor is denied, but the route returns `500` rather than `403`.
  Workflows owns the Checkpoint 2 error-contract gap.
- **Bind and rebind:** Admin can bind on create and rebind to a replacement account on update
  (`200`); the next run reports the replacement account as `effectiveIdentity`. No gap.
- **List for binding:** With the current UIAM `main` image, admin receives `200` and the created
  account is present; editor receives `403`. No gap.

### Execution paths

- **Manual and scheduled:** Both query Elasticsearch with the bound identity. No gap.
- **Agent Builder:** The step runs with the bound identity, but the triggering admin cannot read
  the resulting conversation (`404`). Agent Builder owns the Checkpoint 5 ownership contract.
- **Resume/HITL:** The persisted effective identity survives, but the resumed Elasticsearch request
  uses the resuming user's Task Manager API key. Workflows owns this Checkpoint 2 gap.
- **Event trigger, nested workflow, and retry:** Not yet proven. These remain Workflows follow-up
  probes and are not classified as cross-team gaps without runtime evidence.
- **Bulk/import/managed synchronization:** Code inspection shows paths that persist `run_as`
  without binding synchronization. Workflows owns productionization before those paths support
  service-account settings.

## New or currently unowned gaps

### Resume loses the service-account credential

**Severity:** Critical

**Observed:** A service-account workflow paused at `waitForInput`, was resumed by
`elastic_serverless`, and completed. The execution still reported the service-account id as
`effectiveIdentity`, but a following `GET /_security/_authenticate` step returned:

```json
{
  "username": "elastic_serverless",
  "authentication_type": "api_key",
  "api_key": {
    "name": "TaskManager: workflow:resume - elastic_serverless"
  }
}
```

The persisted identity and the credential actually used after resume disagree. The execution id
from the probe was `1494cc25-4477-4ef3-8699-b58aaabe4847`.

**Suggested owner:** Workflows.

**Why classified as unowned:** The resume handler currently invokes `resumeWorkflow` with the Task
Manager fake request and does not call the service-account scoped-request helper. GitHub searches
found no issue or PR for service-account identity across resume.

**Checkpoint:** Blocks Checkpoint 2 for workflows that pause; otherwise must be an explicit MVP
limitation.

### Agent Builder conversations are not visible to the triggering admin

**Severity:** High pending product confirmation.

**Observed:** The `ai.agent` step completed and returned a conversation id. Reading
`/api/agent_builder/conversations/{id}` as the admin who ran the workflow returned HTTP `404`.

This is internally consistent if the private conversation belongs only to the service account, but
there is currently no user-facing way to inspect that conversation. The expected ownership and
sharing model has not been defined.

**Suggested owner:** Agent Builder, with Workflows and Kibana Security.

**Why classified as unowned:** No matching GitHub issue or specific ownership discussion was found.
The existing execution-identity discussion covers the analogous reporting problem, but not Agent
Builder conversations.

**Checkpoint:** Checkpoint 5 unless the product requires visible conversations in Checkpoint 2.

### A denied YAML update is returned as HTTP 500

**Severity:** Medium.

**Observed authorization matrix:**

- Editor can read the bound workflow.
- Editor cannot list service accounts (`403`).
- Editor can update non-executable metadata such as description (`200`).
- Editor cannot submit the bound workflow YAML, but the attach authorization failure is surfaced as
  `500`, not `403`.
- Editor can run the unchanged admin-bound workflow (`200`).

The denial is correct, but the error contract is not.

**Suggested owner:** Workflows for error propagation, with Kibana Security confirming the error
shape.

**Why classified as unowned:** No matching issue or PR was found.

**Checkpoint:** Checkpoint 2.

## Acknowledged but not yet assigned

### Binding versus use authorization

The MVP notes say administrators bind a service account and users execute workloads based on their
Workflows space privileges. A separate longer-term requirement says users should only see or select
accounts they may use. The current implementation demonstrates the MVP behavior but has no
per-service-account use check.

This is an acknowledged design decision rather than a newly discovered implementation bug. The
binding RFC and draft binding PR are active, but no implementation owner exists for the
post-MVP use policy.

References:

- [Binding authorization discussion](https://elastic.slack.com/archives/C0ALPKC27UK/p1787311456559309)
- [Workflows PoC status](https://elastic.slack.com/archives/C0ALPKC27UK/p1787670803157589)

### Connector credentials

Connectors continue to use their own configured credentials. Per-user OAuth credentials and
third-party service-account credentials remain an acknowledged connector authorization problem,
not a Workflows service-account problem. No change was made in this slice.

Reference:

- [Connector credential discussion](https://elastic.slack.com/archives/C0ALPKC27UK/p1786018320779059)

## Actively owned work

- Kibana binding and scoped-request primitive:
  [#286916](https://github.com/elastic/kibana/issues/286916),
  [PR #286875](https://github.com/elastic/kibana/pull/286875), assigned to Larry Gregory.
- UIAM token exchange: [PR #286664](https://github.com/elastic/kibana/pull/286664), open draft by
  Larry Gregory.
- Real UIAM E2E:
  [#286918](https://github.com/elastic/kibana/issues/286918), assigned to Larry Gregory.
- Stateful/ECH service-account creation:
  [#284464](https://github.com/elastic/kibana/issues/284464), assigned to Larry Gregory.
- Serverless Elasticsearch organization-service-account support was delivered by Elasticsearch
  PRs [#156318](https://github.com/elastic/elasticsearch/pull/156318) and
  [#7448](https://github.com/elastic/elasticsearch-serverless/pull/7448).
- Workflows integration UX has active design ownership with Casper Hübertz and Pavel Manko.

## Workflows-owned follow-up probes

These are visible Workflows productionization gaps, not cross-team blockers:

- Event-triggered execution does not enter the service-account scoped-request path.
- Nested workflow execution does not apply the child workflow's binding.
- Resume identity is broken as demonstrated above; retry behavior still needs a focused probe.
- Bulk create/import/overwrite and managed-workflow synchronization can persist `run_as` without
  attaching a binding.
- The UI must eventually replace the thin id/list probe with the shared service-account management
  experience.

## Suggested handoffs

### Workflows

> Resume identity probe found a concrete bug: after `waitForInput`, the execution still reports the
> service account as `effectiveIdentity`, but the next ES step authenticates with
> `TaskManager: workflow:resume - elastic_serverless`. No existing issue or active owner was found.
> We should either fix resume scoping for Checkpoint 2 or document paused workflows as unsupported.

### Agent Builder

> The `ai.agent` step successfully ran as the bound service account and created a conversation.
> The admin who triggered the workflow then received 404 when reading that conversation. Is a
> service-account-owned conversation intentionally private from all users? If so, how should users
> inspect workflow-created conversations? I could not find an existing owner for this contract.

### Kibana Security

> The current UIAM-backed service-account list works for an admin and denies an editor as expected.
> We still observed attach authorization correctly deny an editor's YAML update but surface it as
> HTTP 500 instead of 403.

### UIAM

> The current `main` image supports create, get, list, delete, and exchange for the integration
> contract. The local mock identity needed the new `ess-default-organization` role assignment
> introduced by UIAM's platform-scoped create authorization.

### ES Security

> No new Serverless ES blocker: real `elasticsearch.request` execution under the UIAM service
> account passes. Stateful/ECH remains tracked under Kibana #284464, so no additional ES gap was
> opened from this probe.

## Ranked unowned gaps and next proofs

1. **Resume credential continuity — Workflows, Checkpoint 2.** Repeat the HITL probe after routing
   resume through the scoped-request helper; `_security/_authenticate` must return the bound
   service-account principal.
2. **Agent Builder conversation ownership — Agent Builder, Checkpoint 5 unless required earlier.**
   Define the visibility contract, then prove the triggering admin can inspect the conversation
   through the supported API or UI.
3. **Denied bind error contract — Workflows with Kibana Security, Checkpoint 2.** Re-run the editor
   YAML update after preserving the authorization status through rollback; expect HTTP `403`.
