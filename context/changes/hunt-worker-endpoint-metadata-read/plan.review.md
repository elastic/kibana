# Plan Review, Gate 1

**Artifact:** `context/changes/hunt-worker-endpoint-metadata-read/plan.md` (+ `plan-brief.md`, `change.md`)
**Shape:** flat  **Round:** 1/3
**Reviewer:** independent subagent (`581e1191-6635-4026-96a2-5fa0a01c0d79`) + orchestrator cross-check against `/Users/stephmilovic/dev/kibana`, `/Users/stephmilovic/dev/elasticsearch`, and `/Users/stephmilovic/dev/elasticsearch-controller`.
**Reviewed:** 2026-10-21 on `main`

## Verdict: REVISE   ·   Tension: 4

The core architecture, role definitions across all three repositories, and `hasPrivileges` self-check design are sound, but Round 1 uncovered 11 ambiguities, contradictions, or rule violations that would either force questions during execution or cause test/prose defects.

## Decisions resolved with Steph (Round 1)

| # | Question | Where | Decision |
|---|----------|-------|----------|
| Q1 | Public Kibana PR linking private `security-team#20382` and `elasticsearch-controller` PR? | Phase 3 §6, `change.md` | Follow `.cursor/rules/never-link-private-issues-in-kibana-prs.mdc` strictly: do **not** link or mention `elastic/security-team` or `elastic/elasticsearch-controller` in the public Kibana or ES PRs. Cross-link on `security-team#20382` and in the private controller PR only. |
| Q2 | How to avoid double `, so ..., so ...` in `select_process_actions.ts:225` (`suspend_only`)? | Phase 3 §4 | Use `"the endpoint's capabilities could not be read (<capability> is not assumed)"` across all three sites (lines 193, 225, 309) via a shared helper `missingCapabilityClause(host, capability)`. |
| Q3 | What is `capabilitiesSource` when `esClient === undefined` in `makeResolveHostEnrollment`? | Phase 3 §2, §5 | `'unavailable'` (with `capabilities: []` and no warning logged), because no endpoint metadata read occurred. Existing no-`esClient` test expectations in `resolve_host_enrollment.test.ts` (lines 37, 238, 266) and the thrown-search test (line 207) expect `'unavailable'`; tests where `esClient` searches (lines 141, 180) expect `'reported'`. |
| Q4 | Execution pacing across Phases 1–3? | Implementation Approach, Phases 1–3 | Develop, locally verify, and open all three PRs (Kibana as `--draft`) in a single pass; pause only before marking ready / merging Phase 3 and before Phase 4 close-out. |
| Q5 | Update `plan.md`, `plan-brief.md`, and `change.md` in place before execution? | Plan bundle | Yes, updated in place. |

## Round 1 Defects Fixed

| # | Sev | Where | Defect | Fix applied |
|---|-----|-------|--------|-------------|
| 1 | HIGH | Phase 3 §6, `change.md` | Instructed linking private `security-team#20382` and `elasticsearch-controller` PR in the public Kibana PR. | Removed private links from public PR specs; linked only the public ES PR and used prose for the Serverless ordering note. |
| 2 | HIGH | Phase 3 §2, §5 | Unspecified `capabilitiesSource` when `esClient === undefined`; `plan.md:403` assumed all existing `resolve_host_enrollment.test.ts` assertions get `'reported'`. | Pinned `esClient === undefined` to `'unavailable'` and enumerated lines 37, 207, 238, 266 (`'unavailable'`) vs. lines 141, 180 (`'reported'`). |
| 3 | MED | Phase 3 §4 | Clause substitution at `select_process_actions.ts:225` produced `"..., so memdump_process is not assumed, so suspend is the only process action proposed"`. | Changed clause to `"the endpoint's capabilities could not be read (<capability> is not assumed)"` across lines 193, 225, 309. |
| 4 | MED | Phase 3 §5 | `decide_package_report.test.ts` spec described a "memdump-capable host whose source is `'unavailable'`" expecting Held back copy from `suspend_only`, which has no `heldBack` and checks `capabilities.includes(...)`. | Specified `capabilities: []`, `capabilitiesSource: 'unavailable'` on a finding where isolation is warranted, asserting both the Suspend proposal's `**Why**` and the recommendation's `**Held back**` (`isolation_unsupported`) copy. |
| 5 | MED | Phase 3 §5 | Omitted 6 inline `CurrentRunHost` literals in `decide_package_report.test.ts` (lines 294, 309, 363, 516, 802, 803) and the shared `resolveHostEnrollment` mock at `read_current_run_state.test.ts:165`. | Enumerated all inline literals and shared mocks explicitly. |
| 6 | MED | Phase 3 §2, §5 | Internal return property was written `source` instead of `capabilitiesSource`; exact `warn`/`debug` log strings were unpinned; `esClientWith` in `resolve_host_enrollment.test.ts` lacked `security.hasPrivileges`. | Pinned `Promise<{ capabilities: string[]; capabilitiesSource: 'reported' | 'unavailable' }>`, exact `warn`/`debug` strings, safe handling if `esClient.security?.hasPrivileges` is absent, and `esClientWith` update. |
| 7 | MED | Phase 3 Automated Verification | Referenced non-existent "endpoint scripts' `session_manager.test.ts`" and combined two Jest configs in one command. | Fixed path to `src/platform/packages/shared/kbn-test-saml-auth/src/session_manager.test.ts` as a separate `node scripts/jest` command. |
| 8 | LOW | Phase 3 §1, Verification, Progress 3.8 | Claimed raw byte-for-byte identity across all three YAML files despite `kbn-es/.../roles.yml` using unquoted strings. | Clarified byte-for-byte identity between `es_serverless_resources/roles.yml` and `security.yaml`, and deep-equal parsed YAML across all three. |
| 9 | LOW | Key Discoveries vs Phase 1 §1 | Line 98 said "under the existing `read` block or a new block" while Phase 1 §1 said a second `IndicesPrivileges` entry. | Standardized on a new `indices` block / second `IndicesPrivileges` entry everywhere, plus alphabetical placement in all 6 maps of `ReservedRolesStoreTests.java`. |
| 10 | LOW | Phase 1 §3 | `docs/changelog/<pr-number>.yaml` requires knowing `<pr-number>` from `gh pr create` first. | Specified opening the ES PR first to obtain `<pr-number>`, then committing and pushing the changelog file. |
| 11 | LOW | Phases 1, 2, 3 §6 | Local ES and controller checkouts are on old branches; Kibana PR labels were not listed. | Specified `upstream/main` for ES, `origin/main` for controller, and `backport:skip`, `v9.6.0`, `release_note:skip`, `Team:Security Investigations` for Kibana. |

---

# Round 2 (revision 2), final

**Reviewer:** fresh independent subagent (`9e2a2cf0-8146-4897-af42-0d86413f9498`) with zero authoring context + orchestrator verification of `esClient.security.hasPrivileges` call signature.

## Verdict: APPROVE   ·   Tension: 1

- Round 1 items resolved: 11/11 defects and 5/5 decisions verified in `plan.md`, `plan-brief.md`, and `change.md`.
- Every file path, line number, type signature (`esClient.security.hasPrivileges({ index: [{ names: [ENDPOINT_METADATA_CURRENT_PATTERN], privileges: ['read'] }] })`), test fixture, and CLI command verified against `/Users/stephmilovic/dev/kibana`, `/Users/stephmilovic/dev/elasticsearch` (`upstream/main`), and `/Users/stephmilovic/dev/elasticsearch-controller` (`origin/main`).
- New defects: **NONE**.
- Missing verification: **NONE**.
- Remaining questions for Steph: **NONE**.

The plan is at **APPROVE** and ready to execute.
