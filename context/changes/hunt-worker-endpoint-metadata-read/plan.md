# Hunt worker read on endpoint metadata Implementation Plan

## Overview

The Hunt worker's service account cannot read `metrics-endpoint.metadata_current_*`, so Hunt
Watch packaging never sees an endpoint's `Endpoint.capabilities` and holds back memory dump and
isolate on every host, with copy that blames the endpoint. This plan grants `read` on that
pattern to the `alertzero_threat_hunt` built-in role in all three places the role is defined
(Elasticsearch reserved role for stateful and ECH, elasticsearch-controller predefined role for
Serverless, and the two Kibana `roles.yml` mirrors), in the merge order the Attack Discovery
grant used last week, and makes packaging say when capabilities could not be read instead of
"the endpoint does not report X".

Source issue: https://github.com/elastic/security-team/issues/20382 (private). Blocks scenario 3
of the QA run in https://github.com/elastic/security-team/issues/19909.

## Current State Analysis

**How the read happens.** `readEndpointCapabilities`
(`x-pack/solutions/security/plugins/alertzero/server/services/fleet/resolve_host_enrollment.ts:39`)
searches `ENDPOINT_METADATA_CURRENT_PATTERN` by `agent.id` with `ignore_unavailable: true` and
`allow_no_indices: true`, using the ES client passed per call. `makeScopedResolveHostEnrollment`
(`resolve_host_enrollment.ts:167`) documents that this must be the step's own scoped client so
the calling identity's privileges apply. `package_report_step.ts:171` passes
`context.contextManager.getScopedEsClient()`. On a scheduled or UI-triggered Worker run that
identity is the `kibana/alertzero_threat_hunt` service account.

**Why the failure is silent.** The same step's `getInternalEsClient` comment
(`package_report_step.ts:65-72`) already records the mechanism for `.kibana-threat-reports`: a
wildcard search by an identity with no privilege on the pattern resolves to zero authorized
indices and returns an empty, error-free result, not a 403. So the capabilities search returns no
hit, `readEndpointCapabilities` yields `[]` without reaching its `catch` warning, and packaging
cannot tell "unreadable" from "the endpoint reports no capabilities".

**Where `[]` bites.** `selectProcessActions`
(`.../watches/hunt/packaging/select_process_actions.ts:173`) computes `canDump` from
`host.capabilities.includes('memdump_process')`; `selectHostActions`
(`select_process_actions.ts:297`) holds a warranted isolate back unless `host.capabilities`
includes `isolation`. Three copy strings say "the endpoint does not report ..."
(`select_process_actions.ts:193, 225, 309`). `CurrentRunHost.capabilities`
(`.../packaging/types.ts:20`) is documented as "`[]` when unknown", which is the conflation.

**Where the role is defined.** Kibana no longer creates or edits worker roles
(`x-pack/solutions/security/packages/kbn-alertzero-common/worker_roles.ts:22-26`). The role exists
in three places:

| Deployment | Definition | Test |
| --- | --- | --- |
| Stateful, ECH | `KibanaOwnedReservedRoleDescriptors.alertZeroThreatHunt` (elastic/elasticsearch, `x-pack/plugin/core/src/main/java/org/elasticsearch/xpack/core/security/authz/store/KibanaOwnedReservedRoleDescriptors.java:1003`) | `ReservedRolesStoreTests.ALERTZERO_WORKER_INDEX_PRIVILEGES` (same path under `src/test`, entry `alertzero_threat_hunt` at line 381) |
| Serverless | `_alertzero_threat_hunt` in elastic/elasticsearch-controller `internal/config/roles/security.yaml:1755` (not in `security.ai_soc_engine.yaml`) | `internal/config/roles_test.go` (`Test_ValidatePredefinedRoles`, `Test_RolesWithReadIndexPrivilegeHaveReadProjectRouting`) |
| Kibana mirrors | `src/platform/packages/shared/kbn-es/src/serverless_resources/project_roles/security/roles.yml:1685` and `x-pack/solutions/security/plugins/security_solution/scripts/endpoint/common/roles_users/serverless/es_serverless_resources/roles.yml:1303` | `src/platform/packages/shared/kbn-es/src/utils/read_roles_from_resource.test.ts` ("serverless project roles") |

The existing index grant in all three is `read` on `apm-*-transaction*`, `auditbeat-*`,
`endgame-*`, `filebeat-*`, `logs-*`, `packetbeat-*`, `traces-apm*`, `winlogbeat-*`; none of those
match `metrics-endpoint.metadata_current_*`.

**Precedent, one week old.** The Attack Discovery alert grant landed as ES
[#162507](https://github.com/elastic/elasticsearch/pull/162507) (descriptor, test matrix,
`docs/changelog/162507.yaml`), controller
[#2153](https://github.com/elastic/elasticsearch-controller/pull/2153) (one YAML file), and Kibana
[#298781](https://github.com/elastic/kibana/pull/298781) (both mirrors), with the Kibana PR body
stating to merge only after the Serverless role change is live. (Note: unlike #298781, the new
Kibana PR must not link or mention private repos `elastic/security-team` or
`elastic/elasticsearch-controller` per the public-repo rule.)

**Release timing.** Elasticsearch cut the `9.6` branch on 2026-10-20 (merge-base `d7531e641898`)
and committed "Feature freeze 9.6" on 2026-10-21; `main` is `9.7.0`. The `9.6` branch already
carries #162507. Kibana `main` is still `9.6.0`. The Elasticsearch change therefore targets
`main` and must be backported to `9.6`, or 9.6.0 ships with this bug.

**Verification tooling.** The security data generator
(`x-pack/solutions/security/plugins/security_solution/scripts/data/generate_cli.js`) seeds, for
`--packs=aws-iam`, a Fleet agent `a1b2c3d4-5e6f-4a1b-9c2d-3e4f5a6b7c8d` for host `WIN-ANALYST01`
with a process tree (`scripts/data/lib/pack_host_correlation.ts:165`), and `--threat-intel-reports`
seeds matching reports. Nothing on `main` writes `metrics-endpoint.metadata_current_*`; the
metadata document is indexed by hand (see Phase 1 manual verification).

## Desired End State

- `GET _security/role/alertzero_threat_hunt` on stateful, and the Query Role API for
  `_alertzero_threat_hunt` on Serverless, show an index entry granting `read` on
  `metrics-endpoint.metadata_current_*`, and the two Kibana mirrors match the controller.
- A Hunt Worker run against a host whose metadata document reports `memdump_process` and
  `isolation` mints suspend plus memory dump per process (or kill on a critical IOC match) and
  isolate when warranted; the Why bullet reads "the endpoint reports memdump_process".
- When the identity running packaging cannot read the metadata index, or the search throws, the
  Why and Held back copy says the endpoint's capabilities could not be read, the server log
  carries one warning per packaging run naming the pattern, and the decision is still suspend
  only.
- The three PRs are cross-linked on security-team#20382, and #19909 records that scenario 3
  passes locally against the Elasticsearch branch and will pass on cloud with the first 9.6
  Elasticsearch build carrying the change.

### Key Discoveries:

- A reserved role update reaches an existing deployment with the Elasticsearch upgrade; the
  service account is already bound to the reserved role, so no Kibana migration is needed
  (`worker_roles.ts:22-26`).
- `read_project_routing` is already on the Serverless role's cluster list
  (`security.yaml:1762`), so the controller's read-index rule in `roles_test.go:248` is already
  satisfied; the change is a new `indices` block after the beats entry.
- The ES test matrix names sample indices by replacing `*` with `sample`
  (`apm-*-transaction*` becomes `apm-sample-transactionsample`), so the new sample is
  `metrics-endpoint.metadata_current_sample`. Every role map lists every sample, so the five
  other `alertzero_*` maps get the same key with `Set.of()`.
- `x-pack/platform/plugins/shared/security/test/scout/api/fixtures/expected_builtin_roles_kibana_access.ts:281`
  asserts the role's Kibana application privileges only; an index grant does not touch it.
- `security_solution`'s own `EndpointMetadataService` reads this index with the internal client
  (`endpoint_metadata_service.ts:82`). That is the alternative this plan rejects (D1); it is
  recorded so a reviewer does not re-raise it as undiscovered.
- The copy fix only helps the bug in this issue if the privilege failure is detectable, and the
  wildcard search does not surface it. A `security.hasPrivileges` self-check on the pattern does
  (any authenticated identity may check its own privileges); see D5.

## What We're NOT Doing

- Switching the capabilities read to the internal user, or adding an internal-user fallback
  (D1). The scoped-client design in `resolve_host_enrollment.ts:160` stands.
- Granting more than `read` on `metrics-endpoint.metadata_current_*` (no `view_index_metadata`,
  no `metrics-endpoint.metadata*`) (D2).
- Changing any packaging decision. A host whose capabilities are unknown still gets suspend only
  and no isolate (D3); only the copy and a log line change.
- Touching `security.ai_soc_engine.yaml` in the controller; the role is not defined there.
- Teaching the data generator to seed `metrics-endpoint.metadata_current_*` documents. Worth a
  follow-up so the aws-iam pack exercises memory dump end to end without a hand-indexed
  document, but not part of this fix.
- A privilege preflight in Hunt settings or the TI dependency callout.
- Any change to the three other Kibana surfaces that mention the role by name only
  (`preflight.test.ts`, `worker_roles.test.ts`, the scout fixture).
- Hand-editing the role or rebinding the worker account on the 9.6 cloud deployment (D6).

## Implementation Approach

Three PRs in the precedent's order, developed and locally verified in parallel (all three PRs
opened in one pass, with the Kibana PR as `--draft`), and merged in sequence:

1. **Elasticsearch** (`main`, backport `9.6`): add `metrics-endpoint.metadata_current_*` with
   `read` to `alertZeroThreatHunt`, extend the test matrix, open the PR to get its number, and
   push `docs/changelog/<pr-number>.yaml`. Prove it end to end locally by running ES from the
   branch under Kibana `main`.
2. **elasticsearch-controller**: the same grant on `_alertzero_threat_hunt` in `security.yaml`.
   Merge, then confirm the role on a Serverless security project shows the grant.
3. **Kibana**: mirror the controller change in both `roles.yml` files, and add a
   `capabilitiesSource` marker from the enrollment resolver through `CurrentRunHost` into the
   three copy strings, with a `hasPrivileges` self-check so the silent wildcard case is caught.
   Open as draft immediately; mark ready and merge only after step 2 is live.
4. **Close-out**: cross-link, record scenario 3 status, update Beads.

Decisions made during planning:

- **D1 Fix approach: role grant, not internal user.** Keeps the worker's privilege model honest
  and matches the deliberate scoped-client design; precedent exists from last week.
- **D2 Grant scope: `read` on `metrics-endpoint.metadata_current_*` only.** Least privilege; the
  lookup is a plain search on the constant the code already uses.
- **D3 Unknown capabilities: keep `[]`, fix the copy.** Decision table unchanged; copy and a log
  line distinguish "could not be read" from "the endpoint does not report".
- **D4 Sequencing: ES and controller first, one Kibana PR after.** Exactly the #162507 / #2153 /
  #298781 order; mirrors never run ahead of the controller.
- **D5 Detectability: `hasPrivileges` self-check, once per packaging run.** Decided in planning
  after confirming the wildcard search returns empty rather than 403 for this identity. The
  probe runs lazily on the first enrolled host and is memoized for the resolver's lifetime (one
  resolver per step run). If the probe itself throws, log at debug and fall through to the
  search, so a probe problem never makes things worse than today.
- **D6 QA on the 9.6 cloud deployment: note it, verify locally.** No manual role edits on
  `steph-az-test`; scenario 3 is recorded as passing locally against the ES branch and pending
  the first 9.6 ES build that carries the change.

## Critical Implementation Details

### Timing & lifecycle

The Kibana PR's YAML mirrors must not merge before the controller change is live on Serverless;
the precedent PRs refused this because local Serverless and FTR would otherwise grant a privilege
production lacks. The copy change in the same PR has no such dependency but rides with it (D4).
The Elasticsearch PR needs the `auto-backport` and `v9.6.0` labels (ES is past 9.6 feature
freeze, so it goes in as `>bug`); if the labels cannot be set as an external contributor, ask
for them in the PR body and from the reviewer.

### Debug & observability

The capabilities search by an under-privileged identity returns empty with no error, so the
existing `catch` warning in `readEndpointCapabilities` never fires for this bug. The
`hasPrivileges` self-check (D5) is what turns the privilege failure into one warning per
packaging run naming `metrics-endpoint.metadata_current_*`. Manual verification of Phase 3 uses
a stock ES snapshot (old role) to see that warning and the new copy, and the ES branch to see
capabilities flow.

### Test data mapping

If `metrics-endpoint.metadata_current_default` does not exist (no Defend package installed
locally), create it with an explicit mapping before indexing the test document: `agent.id`,
`elastic.agent.id`, `host.name`, `Endpoint.capabilities` as `keyword`, `event.created` and
`@timestamp` as `date`. Dynamic mapping would type `agent.id` as `text`, and the lookup's `term`
query on a hyphenated UUID would then never match.

## Phase 1: Elasticsearch reserved role grant

### Overview

Add `read` on `metrics-endpoint.metadata_current_*` to the `alertzero_threat_hunt` reserved
role, with the test matrix row and changelog, as a PR to `elastic/elasticsearch` `main` with a
`9.6` backport. Prove it end to end by running ES from the branch under Kibana `main`.

### Changes Required:

#### 1. Reserved role descriptor

**File**: `x-pack/plugin/core/src/main/java/org/elasticsearch/xpack/core/security/authz/store/KibanaOwnedReservedRoleDescriptors.java` (elastic/elasticsearch, fetch `upstream/main` and branch `alertzero-hunt-endpoint-metadata-read` from `upstream/main`)

**Intent**: Let the Hunt worker read endpoint capability metadata.

**Contract**: `alertZeroThreatHunt` gains a second `IndicesPrivileges` entry:
`RoleDescriptor.IndicesPrivileges.builder().indices("metrics-endpoint.metadata_current_*").privileges("read").build()`.
The existing beats entry, the application privileges, and the shared `alertZeroWorker` base are
unchanged.

#### 2. Reserved role test matrix

**File**: `x-pack/plugin/core/src/test/java/org/elasticsearch/xpack/core/security/authz/store/ReservedRolesStoreTests.java`

**Intent**: Pin the new grant and prove no other worker role gained it.

**Contract**: Add `Map.entry("metrics-endpoint.metadata_current_sample", Set.of("read"))` to the
`alertzero_threat_hunt` map in `ALERTZERO_WORKER_INDEX_PRIVILEGES` (line 381 block) and
`Map.entry("metrics-endpoint.metadata_current_sample", Set.of())` to the other five
`alertzero_*` maps (`alertzero_alert_triage`, `alertzero_attack_discovery`,
`alertzero_endpoint_analysis`, `alertzero_rule_tuning`, `alertzero_rule_coverage`), placed
alphabetically between `logs-sample` and `packetbeat-sample`. The assertion loop at line 4730
checks search, mappings, index, refresh, auto-create, and delete against each entry.

#### 3. Changelog

**File**: `docs/changelog/<pr-number>.yaml`

**Intent**: Required ES changelog entry; follows `docs/changelog/162507.yaml`.

**Contract**: Open the PR first (or push the branch and run `gh pr create`) to obtain
`<pr-number>`, then commit and push `docs/changelog/<pr-number>.yaml` with `area: Authorization`,
`type: bug`, `issues: []`, `pr: <number>`, `summary:` one line naming the role and the index
pattern. Do not reference any private `elastic/security-team` or `elastic/elasticsearch-controller`
issue or PR.

#### 4. PR

**Intent**: Open against `elastic/elasticsearch` `main` from Steph's fork. Apply the
`writing-voice` skill to the title and body. Ask for `auto-backport` and `v9.6.0`.

**Contract**: Body states the symptom (packaging holds back memory dump and isolate), the
grant, that it is the same shape as #162507, the test matrix change, and the local proof
below. Do not link or mention `elastic/security-team` or `elastic/elasticsearch-controller`.
Record the PR URL and (once merged) the backport PR URL in kibana-6gi.1 notes.

### Success Criteria:

#### Automated Verification:

- Reserved role tests pass in the ES checkout:
  `./gradlew :x-pack:plugin:core:test --tests "org.elasticsearch.xpack.core.security.authz.store.ReservedRolesStoreTests"`
- Spotless/precommit for the touched module passes: `./gradlew :x-pack:plugin:core:spotlessApply :x-pack:plugin:core:precommit`
- ES PR opened on `main` with `docs/changelog/<pr-number>.yaml` pushed; CI green on `main` and (after maintainer merge) the `9.6` backport PR exists and is green

#### Manual Verification:

- From the Kibana checkout, ES runs from the branch (`node scripts/es source --source-path ../elasticsearch --license trial`, with Kibana started per `kibana-local-dev-config`); `GET _security/role/alertzero_threat_hunt` lists `metrics-endpoint.metadata_current_*` with `read`
- Hunt worker enabled from the UI (service account bound to the reserved role); `--packs=aws-iam --threat-intel-reports` seeded with `generate_cli.js`; the metadata document indexed at `metrics-endpoint.metadata_current_default/_doc/a1b2c3d4-5e6f-4a1b-9c2d-3e4f5a6b7c8d` with `agent.id`, `elastic.agent.id`, `host.name: WIN-ANALYST01`, `event.created`, and `Endpoint.capabilities: ["isolation","memdump_process","kill_process","suspend_process"]` (mapping per Critical Implementation Details)
- A manual Worker run (`POST /api/workflows/workflow/system-security-hunt-continuous-threat-hunt-default/run` with `inputs.reportIds` set to the aws-iam report) mints suspend plus memory dump per process (or kill on a critical IOC match), the Why bullet reads "the endpoint reports memdump_process", and isolate is minted or held back only by the warranted rule, never by `isolation_unsupported`
- No `resolveHostEnrollment` warning in the Kibana log for that run

**Implementation Note**: Phases 1, 2, and 3 are developed, locally verified, and opened as PRs
in one pass without blocking on remote maintainer merges between phases. Phase blocks use plain
bullets; the corresponding checkboxes live in the `## Progress` section at the bottom of the
plan.

---

## Phase 2: elasticsearch-controller predefined role grant

### Overview

Mirror the grant on the Serverless predefined role `_alertzero_threat_hunt`, merge, and confirm
it is live before the Kibana mirrors merge.

### Changes Required:

#### 1. Predefined role

**File**: `internal/config/roles/security.yaml` (elastic/elasticsearch-controller; fetch
`elastic/elasticsearch-controller` `main` and branch `alertzero-hunt-endpoint-metadata-read`
from it first, as the local checkout is stale)

**Intent**: Same grant as Phase 1 for Serverless security projects.

**Contract**: Under `_alertzero_threat_hunt.indices`, a new entry
`names: ["metrics-endpoint.metadata_current_*"]`, `privileges: ["read"]`,
`allow_restricted_indices: false`, placed after the beats entry. Keep the exact YAML quoting
style of the surrounding entries (double-quoted strings) so the Kibana mirrors can be compared
against it. Cluster and application privileges unchanged (`read_project_routing` is already
present).

#### 2. PR

**Intent**: Open against `elastic/elasticsearch-controller` `main`, same shape as #2153. Apply
`writing-voice`. Link security-team#20382 (private repo to private repo, as #2153 did), the
ES PR, and the Kibana PR.

**Contract**: Body names the symptom, the grant, and states that all six `_alertzero_*` roles
remain identical in parsed content to the Kibana mirrors once Kibana #<phase 3 PR> merges.
Record the PR URL, merge time, and the rollout confirmation in kibana-6gi.2 notes.

### Success Criteria:

#### Automated Verification:

- Controller role tests pass: `go test ./internal/config/...` (covers `Test_ValidatePredefinedRoles`, `Test_RolesYamlFilesAreValid`, `Test_RolesWithReadIndexPrivilegeHaveReadProjectRouting`)
- Controller PR CI is green and the PR is merged

#### Manual Verification:

- On a Serverless security project after rollout, the Query Role API (`GET /api/security/role/_alertzero_threat_hunt` through Kibana, or the ES query-role API) returns the role with the `metrics-endpoint.metadata_current_*` entry
- The rollout confirmation (project, date) is recorded in kibana-6gi.2 notes; Phase 3's merge waits on it

**Implementation Note**: Code and PR creation for Phase 2 and Phase 3 proceed in the same pass
as Phase 1; only merging the Phase 3 Kibana PR waits on Phase 2 being merged and live on
Serverless.

---

## Phase 3: Kibana PR: mirrors plus unreadable-capabilities copy

### Overview

Mirror the controller change in both Kibana `roles.yml` files, and make packaging distinguish
"capabilities could not be read" from "the endpoint reports none" in its copy and logs, with the
decision table unchanged. Open as a draft right away; mark ready and merge only after Phase 2 is
live.

### Changes Required:

#### 1. Serverless role mirrors

**Files**:
`src/platform/packages/shared/kbn-es/src/serverless_resources/project_roles/security/roles.yml`
(the `_alertzero_threat_hunt` block at line 1685, which uses unquoted index names/privileges) and
`x-pack/solutions/security/plugins/security_solution/scripts/endpoint/common/roles_users/serverless/es_serverless_resources/roles.yml`
(block at line 1303, which uses double-quoted strings matching `security.yaml`)

**Intent**: Keep the local Serverless role identical to the controller's.

**Contract**: The same new `indices` entry as Phase 2, in each file's own quoting style. After
the edit, the `_alertzero_threat_hunt` block in `es_serverless_resources/roles.yml` is
byte-for-byte identical to the controller `security.yaml` block, and the parsed YAML of all
three `_alertzero_threat_hunt` blocks is deep-equal.

#### 2. Enrollment resolver: capabilities source and privilege self-check

**File**: `x-pack/solutions/security/plugins/alertzero/server/services/fleet/resolve_host_enrollment.ts`

**Intent**: Report whether capabilities were actually read, and detect the silent
under-privileged case instead of relying on a thrown error.

**Contract**:
- `HostEnrollment`'s enrolled variant gains `capabilitiesSource: 'reported' | 'unavailable'`.
  `'reported'` covers a document with a string-array `Endpoint.capabilities`, a missing
  document, and a missing or malformed field (today's semantics, including `[]`).
  `'unavailable'` covers three cases: no `esClient` was passed (`esClient === undefined`, which
  skips `readEndpointCapabilities` and returns `{ enrolled: true, agentId: agent.id, capabilities: [], capabilitiesSource: 'unavailable' }`),
  the search threw (existing `catch`), or the privilege self-check said the identity lacks
  `read` on `ENDPOINT_METADATA_CURRENT_PATTERN`.
- `readEndpointCapabilities` returns `Promise<{ capabilities: string[]; capabilitiesSource: 'reported' | 'unavailable' }>`.
- The self-check is `esClient.security.hasPrivileges({ index: [{ names: [ENDPOINT_METADATA_CURRENT_PATTERN], privileges: ['read'] }] })`,
  evaluated lazily on the first enrolled host and memoized per resolver returned by
  `makeResolveHostEnrollment` (one resolver per step run, so one probe per packaging run).
  `has_all_requested === false` short-circuits to `{ capabilities: [], capabilitiesSource: 'unavailable' }`
  without searching, and logs one `warn`:
  `` `resolveHostEnrollment: caller lacks read privilege on ${ENDPOINT_METADATA_CURRENT_PATTERN}; treating every host in this run as capabilities unknown` ``.
  A probe that throws (or if `esClient.security?.hasPrivileges` is absent in a partial test
  mock, treat absence as `true` without throwing; if `hasPrivileges` itself rejects) logs at
  `debug`:
  `` `resolveHostEnrollment: privilege check for ${ENDPOINT_METADATA_CURRENT_PATTERN} failed; falling through to search — ${error instanceof Error ? error.message : String(error)}` ``
  and falls through to the search, so the probe can never make the outcome worse than today.
- The existing `catch` warning text stays; it now also yields `capabilitiesSource: 'unavailable'`.
- Update the file's doc comments: the "`[]` when unknown" wording on the pattern constant and
  the resolver, and the `makeScopedResolveHostEnrollment` comment that explains why the scoped
  client is used (add one sentence: the self-check is what makes a privilege gap visible).

#### 3. Run state host shape

**File**: `x-pack/solutions/security/plugins/alertzero/server/services/watches/hunt/packaging/types.ts`
and `read_current_run_state.ts` (host construction at line 255)

**Intent**: Carry the marker to the decision and copy layer.

**Contract**: `CurrentRunHost` gains `capabilitiesSource: 'reported' | 'unavailable'`; the
`capabilities` doc comment drops "`[]` when unknown". `read_current_run_state.ts` threads
`enrollment.capabilitiesSource` for enrolled hosts and sets `'reported'` for unenrolled hosts
(an unenrolled host has no endpoint to read).

#### 4. Copy

**File**: `x-pack/solutions/security/plugins/alertzero/server/services/watches/hunt/packaging/select_process_actions.ts`

**Intent**: Say what actually happened.

**Contract**: The three strings at lines 193, 225, and 309 keep their current wording when
`host.capabilitiesSource === 'reported'`. When `'unavailable'`, the clause "the endpoint does
not report `<capability>`" becomes `"the endpoint's capabilities could not be read (<capability> is not assumed)"`
(using parentheses so line 225 reads `"Rule: default response; the endpoint's capabilities could not be read (memdump_process is not assumed), so suspend is the only process action proposed"`
without a double `, so ..., so ...`, and lines 193 and 309 read `"No action was proposed for ${process} on ${host.name}: it is a protected system process and the endpoint's capabilities could not be read (memdump_process is not assumed)"`
and `"Isolate host ${args.host.name} was not proposed: it was warranted (${decision.why.replace(/^Rule: /, '')}) but the endpoint's capabilities could not be read (isolation is not assumed)"`).
Rule names and action lists are unchanged. Put the clause behind one small helper
(e.g. `missingCapabilityClause(host, capability)`) so the three sites cannot drift.

#### 5. Tests

**Files**:
`resolve_host_enrollment.test.ts` (update `esClientWith` to include `security: { hasPrivileges: jest.fn().mockResolvedValue({ has_all_requested: true }) }`, update existing `toEqual` assertions: lines 37, 207, 238, 266 expect `capabilitiesSource: 'unavailable'`, and lines 141, 180 expect `capabilitiesSource: 'reported'`),
`select_process_actions.test.ts` (`host(capabilities = [], capabilitiesSource = 'reported')` helper at line 21),
`decide_package_report.test.ts` (`enrolledHost(name, agentId, capabilities = ['isolation'], capabilitiesSource = 'reported')` at line 183, plus the 6 inline `CurrentRunHost` literals at lines 294, 309, 363, 516, 802, 803),
`proposal_copy.test.ts` (`host` at line 16),
`read_current_run_state.test.ts` (shared `resolveHostEnrollment` mock at line 165, plus the capabilities threading test at line 729),
`run_package_report.test.ts` (`resolveHostEnrollment` mock at line 202),
`build_investigation_summary.test.ts` (`hosts` fixture at line 35)

**Intent**: Pin the new marker and copy; keep every existing expectation green.

**Contract**:
- Fixtures gain `capabilitiesSource: 'reported'` by default (except no-`esClient` and search-throws assertions in `resolve_host_enrollment.test.ts`, which expect `'unavailable'`).
- New `resolve_host_enrollment` cases: self-check `false` short-circuits to `'unavailable'` with
  no search and one warning; self-check runs once across two enrolled hosts; self-check throws
  logs at `debug` and falls through to the search; search throws yields `'unavailable'`; a found
  document yields `'reported'`; no document yields `'reported'` with `[]`; no `esClient` yields
  `'unavailable'` with `[]`.
- New `select_process_actions` cases: `suspend_only` Why copy and the protected-process
  held-back line under `'unavailable'`; `isolation_unsupported` held-back line under
  `'unavailable'`; rule and actions identical to the `'reported'` `[]` case.
- `read_current_run_state`: the threading test asserts `capabilitiesSource` (`'reported'` /
  `'unavailable'` from enrollment for enrolled hosts, `'reported'` for unenrolled hosts).
- One `decide_package_report` case: an enrolled host with `capabilities: []` and
  `capabilitiesSource: 'unavailable'` on a finding where isolate is warranted (e.g. two
  processes `[ps1, rundll]` or `severity: 'critical'`) mints suspend only whose Why comment
  carries `"the endpoint's capabilities could not be read (memdump_process is not assumed)"`,
  and the recommendation's Held back section carries `"the endpoint's capabilities could not be read (isolation is not assumed)"`.

#### 6. PR

**Intent**: Draft PR against `elastic/kibana` `main` (Kibana is still 9.6.0, no backport),
apply `writing-voice` and `kibana-pr-authoring`. Labels: `backport:skip`, `v9.6.0`,
`release_note:skip`, `Team:Security Investigations`. Link the public ES PR only; do **not** link
or mention `elastic/security-team#20382` or `elastic/elasticsearch-controller` (both are private
repos). Body opens with "Merge only after the corresponding Serverless predefined role change is
live."

**Contract**: Summary, what changed (mirrors; marker and copy; self-check), `## To test` (the
two manual runs below). Record the PR URL, draft status, and pushed SHA in kibana-6gi.3 notes.

### Success Criteria:

#### Automated Verification:

- Fleet service tests pass: `node scripts/jest x-pack/solutions/security/plugins/alertzero/server/services/fleet`
- Packaging tests pass: `node scripts/jest x-pack/solutions/security/plugins/alertzero/server/services/watches/hunt/packaging`
- Step tests pass: `node scripts/jest x-pack/solutions/security/plugins/alertzero/server/step_types/package_report`
- Role mirror tests pass (run as two separate commands, one config each):
  - `node scripts/jest src/platform/packages/shared/kbn-es/src/utils/read_roles_from_resource.test.ts`
  - `node scripts/jest src/platform/packages/shared/kbn-test-saml-auth/src/session_manager.test.ts`
- Type check passes: `node scripts/type_check --project x-pack/solutions/security/plugins/alertzero/tsconfig.json`
- Lint passes on changed files: `node scripts/eslint $(git diff --name-only)`
- `node scripts/check --scope=branch` passes
- The `_alertzero_threat_hunt` block in `es_serverless_resources/roles.yml` is byte-for-byte equal to the controller `security.yaml` block, and the parsed YAML of `_alertzero_threat_hunt` is deep-equal across both mirrors and the controller YAML

#### Manual Verification:

- Against a stock ES snapshot (old role) with the Phase 1 seed data: the Worker run's Kibana log shows one warning naming `metrics-endpoint.metadata_current_*`, and the proposals' Why and Held back copy reads "the endpoint's capabilities could not be read", with suspend-only decisions unchanged
- Against ES from the Phase 1 branch: the same run mints suspend plus memory dump and the reported-capabilities copy, with no warning
- PR marked ready and merged only after kibana-6gi.2 notes record the Serverless rollout

**Implementation Note**: Pause before marking the Phase 3 Kibana PR ready for review or merging
it until Phase 2 is merged and confirmed live on Serverless, and pause for human confirmation
before closing the Beads issues in Phase 4.

---

## Phase 4: Close-out

### Overview

Leave the issue trail complete for QA and for the next person who hits a silent privilege gap.

### Changes Required:

#### 1. security-team#20382

**Intent**: Cross-link the three PRs and state where the fix lands per deployment type.

**Contract**: One comment (apply `writing-voice`) listing the ES PR and its 9.6 backport, the
controller PR with rollout date, and the Kibana PR; stating that stateful and ECH get the fix
with the first 9.6 Elasticsearch build carrying the backport, Serverless with the controller
rollout; and that the capabilities-unreadable case now surfaces in copy and logs. Close the
issue only when all three are merged and the user confirms.

#### 2. security-team#19909 scenario 3

**Intent**: Record QA status honestly (D6).

**Contract**: One comment: scenario 3 passes locally against the ES branch (with the run id and
proposal titles from Phase 1's manual verification), and on `steph-az-test` it will pass once
the deployment runs a 9.6 ES build that includes the backport; the cloud checkbox stays open
until then.

#### 3. Beads

**Intent**: The tracker holds the state.

**Contract**: Each of kibana-6gi.1 to .4 has notes with branch, PR URL, draft or merged status,
pushed SHA, and gate results with counts. The epic's notes keep the plan path. Close children
only on the user's confirmation; `bd dolt push` at the end of each session.

### Success Criteria:

#### Automated Verification:

- `bd show kibana-6gi` lists all four children with notes carrying PR URLs and states

#### Manual Verification:

- Both issue comments posted and read back for accuracy
- The user confirms the epic can close

---

## Testing Strategy

### Unit Tests:

- ES: `ReservedRolesStoreTests` matrix proves `alertzero_threat_hunt` has search on
  `metrics-endpoint.metadata_current_sample` and no other `alertzero_*` role does.
- Controller: `roles_test.go` validates names, YAML, and the read-index routing rule.
- Kibana: resolver (self-check paths, thrown search, found and missing document), decision
  copy under both sources, run-state threading, one end-to-end `decide_package_report` case,
  mirror parsing tests.

### Integration Tests:

- None added. The behaviour is a role grant plus copy; the end-to-end proof is manual (below)
  because it needs ES built from a branch and a seeded Fleet agent.

### Manual Testing Steps:

1. Build and run ES from the Phase 1 branch under Kibana `main`; confirm the role shows the grant.
2. Enable the Hunt worker from the UI; seed `--packs=aws-iam --threat-intel-reports`; index the
   `WIN-ANALYST01` metadata document with the four capabilities and the explicit mapping.
3. Run the Worker manually for the aws-iam report; confirm suspend plus memory dump (or kill)
   per process, isolate per the warranted rule, "the endpoint reports memdump_process" copy, no
   enrollment warning.
4. Repeat step 3 against a stock ES snapshot with the Phase 3 Kibana branch; confirm the
   "could not be read" copy and the single warning, decisions unchanged.
5. After the controller rollout, confirm the Serverless role shows the grant.

## Performance Considerations

One extra `has_privileges` call per packaging run (memoized per resolver), only when at least
one host is enrolled. Negligible next to the per-host Fleet lookup and metadata search that
already run.

## Migration Notes

None. Reserved and predefined roles update in place with the ES or controller release; the
worker's service account is already bound by name. Stateful accounts created before the
reserved roles existed (and still holding a custom role, per #296547's follow-up note) are out
of scope here, as they were there.

## References

- Source issue: https://github.com/elastic/security-team/issues/20382 (private)
- QA run: https://github.com/elastic/security-team/issues/19909 (private)
- Capability gating origin: https://github.com/elastic/kibana/pull/295807
- Precedent: https://github.com/elastic/elasticsearch/pull/162507,
  https://github.com/elastic/elasticsearch-controller/pull/2153,
  https://github.com/elastic/kibana/pull/298781
- Serverless predefined roles: https://github.com/elastic/kibana/pull/296547
- Resolver: `x-pack/solutions/security/plugins/alertzero/server/services/fleet/resolve_host_enrollment.ts:39-181`
- Step wiring: `x-pack/solutions/security/plugins/alertzero/server/step_types/package_report/package_report_step.ts:65-72,171`
- Decision copy: `x-pack/solutions/security/plugins/alertzero/server/services/watches/hunt/packaging/select_process_actions.ts:173,193,225,297-310`
- Generator pack hosts: `x-pack/solutions/security/plugins/security_solution/scripts/data/lib/pack_host_correlation.ts:165`
- Tracker: epic kibana-6gi, children kibana-6gi.1 to kibana-6gi.4

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.
>
> In a repo with `.beads/`, these checkboxes are a convenience view, not the record. The Beads
> issues are the record: update the child task's notes with branch, PR URL, draft status,
> pushed SHA, and gate results as each phase lands, and do not close an issue until the user
> confirms.

### Phase 1: Elasticsearch reserved role grant

#### Automated

- [x] 1.1 ReservedRolesStoreTests pass
- [x] 1.2 spotlessApply and precommit pass for x-pack:plugin:core
- [ ] 1.3 ES PR green on main; 9.6 backport PR exists and is green

#### Manual

- [x] 1.4 ES from branch shows the grant on alertzero_threat_hunt
- [x] 1.5 Hunt worker enabled, aws-iam pack seeded, WIN-ANALYST01 metadata document indexed
- [x] 1.6 Worker run mints suspend plus memory dump (or kill), isolate per warranted rule, reported-capabilities copy
- [x] 1.7 No resolveHostEnrollment warning in the Kibana log for that run

### Phase 2: elasticsearch-controller predefined role grant

#### Automated

- [ ] 2.1 go test ./internal/config/... passes
- [ ] 2.2 Controller PR CI green and merged

#### Manual

- [ ] 2.3 Serverless security project returns _alertzero_threat_hunt with the new entry
- [ ] 2.4 Rollout confirmation recorded in kibana-6gi.2 notes

### Phase 3: Kibana PR: mirrors plus unreadable-capabilities copy

#### Automated

- [ ] 3.1 Fleet service jest passes
- [ ] 3.2 Packaging jest passes
- [ ] 3.3 package_report step jest passes
- [ ] 3.4 read_roles_from_resource and session_manager jest pass
- [ ] 3.5 type_check for alertzero passes
- [ ] 3.6 eslint on changed files passes
- [ ] 3.7 node scripts/check --scope=branch passes
- [ ] 3.8 _alertzero_threat_hunt block parsed YAML deep-equal across both mirrors and the controller YAML (and byte-for-byte equal between es_serverless_resources/roles.yml and security.yaml)

#### Manual

- [ ] 3.9 Stock ES snapshot run shows one warning and the "could not be read" copy, decisions unchanged
- [ ] 3.10 ES branch run shows suspend plus memory dump and reported-capabilities copy, no warning
- [ ] 3.11 PR marked ready and merged only after the Serverless rollout is recorded

### Phase 4: Close-out

#### Automated

- [ ] 4.1 bd show kibana-6gi lists four children with PR URLs and states in notes

#### Manual

- [ ] 4.2 Comments posted on security-team#20382 and #19909 and read back
- [ ] 4.3 User confirms the epic can close
