# Hunt worker read on endpoint metadata — Plan Brief

> Full plan: `context/changes/hunt-worker-endpoint-metadata-read/plan.md`
> Tracker: epic kibana-6gi (children kibana-6gi.1 to .4)
> Source issue: https://github.com/elastic/security-team/issues/20382 (private)

## What & Why

The Hunt worker runs as the `kibana/alertzero_threat_hunt` service account, whose built-in role
cannot read `metrics-endpoint.metadata_current_*`. Packaging therefore never sees an endpoint's
capabilities, holds back memory dump and isolate on every host, and tells the analyst "the
endpoint does not report memdump_process / isolation" when the endpoint reports both. QA scenario
3 in security-team#19909 cannot pass until this is fixed.

## Starting Point

The role is defined in three places Kibana does not own at runtime: the Elasticsearch reserved
role (stateful, ECH), the elasticsearch-controller predefined role (Serverless), and two Kibana
`roles.yml` mirrors used by local Serverless and tests. The capabilities read deliberately uses the
step's scoped client so the worker's privileges apply; an under-privileged wildcard search returns
empty with no error, so today the failure is indistinguishable from an endpoint with no
capabilities.

## Desired End State

The role grants `read` on `metrics-endpoint.metadata_current_*` everywhere it is defined. A Worker
run against a Defend host that reports `memdump_process` and `isolation` mints suspend plus memory
dump per process and isolate when warranted. If the identity ever cannot read the index again, the
proposal copy says the capabilities could not be read, one warning names the pattern, and the
decision stays suspend only.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Fix approach | Grant on the role, not an internal-user read | Keeps the worker's privilege model honest and matches the scoped-client design and last week's Attack Discovery precedent. |
| Grant scope | `read` on `metrics-endpoint.metadata_current_*` only | Least privilege; the lookup is a plain search on the constant the code already uses. |
| Unknown capabilities | Keep `[]`, fix the copy and log | Decision table unchanged; analysts and QA see the real cause. |
| Detecting the gap | `has_privileges` self-check once per packaging run | The wildcard search returns empty rather than 403, so only a self-check makes the privilege gap visible. |
| Sequencing | ES and controller PRs first, one Kibana PR merged after the controller is live | Same order as #162507 / #2153 / #298781; mirrors never run ahead of production Serverless. |
| QA on the 9.6 cloud deployment | Verify locally, note status on both issues | No hand edits to the deployment; the fix reaches it with the first 9.6 ES build carrying the backport. |

## Scope

**In scope:**
- ES reserved role descriptor, test matrix, changelog; PR to `main` with `9.6` auto-backport
- Controller `security.yaml` grant on `_alertzero_threat_hunt`
- Both Kibana `roles.yml` mirrors
- `capabilitiesSource` marker from the resolver through `CurrentRunHost` to the three copy strings, with the self-check and tests
- Issue comments and Beads notes

**Out of scope:**
- Internal-user read or fallback
- Broader grants (`view_index_metadata`, `metrics-endpoint.metadata*`)
- Any packaging decision change
- Generator support for seeding endpoint metadata documents (follow-up candidate)
- Hand-editing roles or accounts on `steph-az-test`

## Architecture / Approach

Three repos, one grant each, developed and locally verified in one pass and merged in the
precedent's order. On the Kibana side the only logic change is in the enrollment resolver: a
memoized `has_privileges` probe on the pattern, a `'reported' | 'unavailable'` source carried on
the host (`'unavailable'` when `esClient` is absent, when `hasPrivileges` returns `false`, or when
the search throws), and a shared copy clause (`"the endpoint's capabilities could not be read (<capability> is not assumed)"`)
used by the three "does not report" strings in `select_process_actions.ts`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Elasticsearch reserved role grant | Grant, test matrix row, changelog; local end-to-end proof with ES from the branch | ES is past 9.6 feature freeze; backport labels must be requested or 9.6.0 ships with the bug |
| 2. Controller predefined role grant | Serverless role updated and confirmed live | Rollout timing gates Phase 3's merge |
| 3. Kibana PR | Mirrors plus unreadable-capabilities marker and copy, tests | `has_privileges` behaviour for a service-account identity must be confirmed in the manual run |
| 4. Close-out | Cross-linked PRs, honest scenario 3 status, Beads notes | None |

**Prerequisites:** Write access to open PRs from forks of elastic/elasticsearch and
elastic/elasticsearch-controller (both used last week); a local ES build from source for Phase 1.
**Estimated effort:** About two working sessions of implementation across the three repos, plus
wall-clock waiting on ES review and backport and on the controller rollout before Phase 3 merges.

## Open Risks & Assumptions

- The `has_privileges` self-check is assumed to work for the service-account identity the Worker
  runs as; the plan falls through to the search if the probe throws, so a surprise here degrades
  to today's behaviour, not worse.
- The Kibana PR cloud deployment picks up a new ES build only when redeployed; whether
  `steph-az-test` can be refreshed to a 9.6 build with the backport is not settled here.
- The ES PR goes in as `>bug` after feature freeze; if reviewers push back on the 9.6 backport,
  stateful 9.6.0 ships with the bug and the issue comment must say so.

## Success Criteria (Summary)

- A Worker run on a memdump-capable, isolation-capable Defend host mints memory dump and, when
  warranted, isolate, on stateful (ES branch) and on Serverless after rollout.
- When the metadata index is unreadable, the proposal copy and a single warning say so, and the
  decisions are unchanged.
- All three PRs merged in order, cross-linked on security-team#20382, scenario 3 status recorded
  on security-team#19909.
