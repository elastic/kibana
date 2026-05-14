# Security Skills Eval Infrastructure Audit

**Generated:** 2026-05-14  
**Branch:** ao/security-skills-eval-infr-10db5f  
**Method:** MCP composite (skill.list → evaluation.find-suites → evaluation.gate-evaluator-stack × 6 suites → tooling.inspect × 7 skills → skill.lint × 7 skills → skill.similarity × 7 skills → treadmill plan reconciliation)  
**ES connectivity at audit time:** OFFLINE — `evaluation.list-runs` returned `fetch failed`; all `last_run` and `within_30_days` values are null.

---

## Section 1: Skill × Suite Matrix

> Legend: 🔴 missing / null | 🟡 warning / stale | 🟢 pass / healthy

| Skill ID | Suite Path | Gate Verdict | Last Run | Within 30d | Notes |
|---|---|---|---|---|---|
| `alert-analysis` | 🔴 none | 🔴 n/a | 🔴 null | 🔴 null | No eval suite; 5 tools referenced but undeclared |
| `detection-rule-edit` | 🟡 `kbn-evals-suite-security-ai-rules` | 🟡 WARNING | 🔴 null | 🔴 null | Skill content is empty (lint ERROR); suite missing `createSkillInvocationEvaluator` + `createTrajectoryEvaluator` |
| `entity-analytics` | 🟡 `kbn-evals-suite-entity-analytics` | 🟡 WARNING | 🔴 null | 🔴 null | Skill content too-short (5 words); suite missing `createSkillInvocationEvaluator` + `createTrajectoryEvaluator`; silent error-swallow bug (lines 292-295) |
| `find-security-ml-jobs` | 🔴 none | 🔴 n/a | 🔴 null | 🔴 null | No eval suite; soft-language warnings ("may", "might") |
| `fp-rule-triage` | 🔴 none | 🔴 n/a | 🔴 null | 🔴 null | No eval suite; placeholder token `<RULE_NAME>` at line 83 |
| `fp-rule-tuning` | 🔴 none | 🔴 n/a | 🔴 null | 🔴 null | No eval suite; 4 placeholder tokens; declared tool `platform.core.generate_esql` not mentioned in content |
| `threat-hunting` | 🔴 none | 🔴 n/a | 🔴 null | 🔴 null | No eval suite; 9 undeclared tool references |
| `pci-compliance` ¹ | 🟢 `kbn-evals-suite-pci-compliance` | 🟡 WARNING | 🔴 null | 🔴 null | Reference implementation; missing only `createTrajectoryEvaluator` |
| `automatic_troubleshooting` ¹ | 🔴 not found | 🔴 n/a | 🔴 null | 🔴 null | Not present in builtin skill registry at audit time |

> ¹ `pci-compliance` and `automatic_troubleshooting` are user-registered skills (not builtin). The Agent Builder API was unreachable during this audit; they appear in the design spec but are absent from the builtin registry endpoint that was consulted. `pci-compliance` is confirmed present as a separate eval suite (`kbn-evals-suite-pci-compliance`).

**Standalone eval suites (not mapped to a registered skill):**

| Suite | Feature Under Test | Notes |
|---|---|---|
| `kbn-evals-suite-attack-discovery` | Attack Discovery feature | Domain-specific evaluators; no registered skill |
| `kbn-evals-suite-endpoint` | Endpoint response actions | Domain-specific evaluator; no registered skill |
| `kbn-evals-suite-security-automatic-migrations` | SIEM rule migration | 8 custom evaluators; no registered skill |

---

## Section 2: Gate-Evaluator-Stack Verdicts

> Columns: ✅ present | ❌ missing | — not applicable

| Suite | Overall | `createSkillInvocationEvaluator` | `traceBasedEvaluators` (spread) | `createTrajectoryEvaluator` | `traceEsClient` fixture | `EVALUATION_REPETITIONS` env-var |
|---|---|---|---|---|---|---|
| `kbn-evals-suite-pci-compliance` | 🟡 WARNING | ✅ | ✅ (via `createSkillInvocationEvaluator`) | ❌ | ✅ | ❌ hardcoded |
| `kbn-evals-suite-entity-analytics` | 🟡 WARNING | ❌ | — | ❌ | ❌ | ❌ hardcoded |
| `kbn-evals-suite-attack-discovery` | 🟡 WARNING | ❌ | — | ❌ | ❌ | ❌ hardcoded |
| `kbn-evals-suite-endpoint` | 🟡 WARNING | ❌ | — | ❌ | ❌ | ❌ hardcoded |
| `kbn-evals-suite-security-automatic-migrations` | 🟡 WARNING | ❌ | — | ❌ | ❌ | ❌ hardcoded |
| `kbn-evals-suite-security-ai-rules` | 🟡 WARNING | ❌ | — | ❌ | ❌ | ❌ hardcoded |

**No suite returned a HARD-BLOCK.** All six WARNING verdicts are caused by the same two structural gaps: absence of `createSkillInvocationEvaluator` (verifies the skill was loaded during execution) and `createTrajectoryEvaluator` (verifies tool-call alignment via LCS/coverage). `kbn-evals-suite-pci-compliance` is the only suite that wires `traceEsClient` and calls `createSkillInvocationEvaluator`, making it the reference implementation.

**`EVALUATION_REPETITIONS` posture:** All suites implicitly run one repetition. None expose the env-var hook. Stochastic prompt sensitivity is therefore undetectable.

---

## Section 3: Per-Skill Quality

### 3.1 `alert-analysis`

**Lint:** 6 × info  
**Similarity:** max non-self score = `fp-rule-triage` 0.202 (LOW — no collision)  
**Tooling inspect:** 0 scanned files, 0 tools returned (empty `toolIds` in builtin registry)

| Lint finding | Severity | Detail |
|---|---|---|
| mentioned-tool-not-declared | info | `security.alerts` |
| mentioned-tool-not-declared | info | `security.alert-analysis.get-related-alerts` |
| mentioned-tool-not-declared | info | `security.security_labs_search` |
| mentioned-tool-not-declared | info | `security.entity_risk_score` |
| mentioned-tool-not-declared | info | (additional undeclared refs) |
| mentioned-tool-not-declared | info | (additional undeclared refs) |

**Assessment:** Content is well-formed (3 214 chars, 473 words). Tool references are informational only — the skill functions at runtime, but the registry contract is incomplete. No eval suite exists; blind to regression.

---

### 3.2 `detection-rule-edit`

**Lint:** 1 × ERROR  
**Similarity:** max non-self score = `fp-rule-triage` 0.384 (MEDIUM — under 0.55 collision threshold)  
**Tooling inspect:** 0 scanned files, 0 tools returned

| Lint finding | Severity | Detail |
|---|---|---|
| empty-content | ERROR | Skill content is empty |

**Assessment:** This is the most critical skill quality defect in the audit. The skill has no content; the agent receives no grounding instructions when `detection-rule-edit` is loaded. The associated eval suite (`kbn-evals-suite-security-ai-rules`) tests rule generation via `security.create_detection_rule` but cannot meaningfully evaluate skill fidelity against empty content. Active plan `entity-analytics-evals-wire-baseline-observability` does not address this skill.

---

### 3.3 `entity-analytics`

**Lint:** 1 × WARN  
**Similarity:** max non-self score = `significant-events-memory` 0.137 (LOW — no collision)  
**Tooling inspect:** 0 scanned files, 0 tools returned

| Lint finding | Severity | Detail |
|---|---|---|
| too-short | WARN | 5 words — under 80-word threshold; insufficient grounding |

**Assessment:** Skill content is critically under-specified (5 words). The entity-analytics eval suite runs but tests against a near-empty grounding surface. Plan `entity-analytics-evals-wire-baseline-observability` (feature `evals-entity-analytics-v2-uplift`, currently paused at 7% completion) aims to wire `createSkillInvocationEvaluator` and trace-based evaluators into this suite but does not address the skill content gap itself.

**Additional suite bug:** `kbn-evals-suite-entity-analytics/src/evaluate_dataset.ts` lines 292-295 contain a silent empty catch block. Evaluation failures are swallowed, producing artificially clean run results.

---

### 3.4 `find-security-ml-jobs`

**Lint:** 4 × info (2 soft-language, 2 undeclared tools)  
**Similarity:** max non-self score = `entity-analytics` 0.126 (LOW — no collision)  
**Tooling inspect:** 0 scanned files, 0 tools returned

| Lint finding | Severity | Detail |
|---|---|---|
| soft-language | info | "may" — non-committal phrasing |
| soft-language | info | "might" — non-committal phrasing |
| mentioned-tool-not-declared | info | `find.security.ml` |
| mentioned-tool-not-declared | info | `platform.core.generate_esql`, `platform.core.execute_esql` |

**Assessment:** Content is adequate (4 278 chars, 634 words). Soft-language warnings are minor but indicate guidance that could be made more directive. No eval suite exists.

---

### 3.5 `fp-rule-triage`

**Lint:** 1 × WARN, 4 × info  
**Similarity:** max non-self score = `detection-rule-edit` 0.298 (LOW — no collision)  
**Tooling inspect:** 0 scanned files, 0 tools returned  
**Declared tools:** `platform.core.execute_esql`, `platform.core.generate_esql`

| Lint finding | Severity | Detail |
|---|---|---|
| placeholder-token | WARN | `<RULE_NAME>` at line 83 — unresolved template variable |
| mentioned-tool-not-declared | info | (multiple undeclared tool refs) |
| mentioned-tool-not-declared | info | (multiple undeclared tool refs) |
| mentioned-tool-not-declared | info | (multiple undeclared tool refs) |
| mentioned-tool-not-declared | info | (multiple undeclared tool refs) |

**Assessment:** Content is good (4 592 chars, 715 words) and this skill has the most complete tool declarations (2 declared tools). The `<RULE_NAME>` placeholder at line 83 is a concrete content defect — if the template interpolation step was skipped during registration, the agent will emit the literal string `<RULE_NAME>` to the user. No eval suite exists.

---

### 3.6 `fp-rule-tuning`

**Lint:** 4 × WARN, 3 × info  
**Similarity:** max non-self score = `detection-rule-edit` 0.321 (MEDIUM — under 0.55 threshold)  
**Tooling inspect:** 0 scanned files, 0 tools returned  
**Declared tools:** `platform.core.execute_esql`, `platform.core.generate_esql`

| Lint finding | Severity | Detail |
|---|---|---|
| placeholder-token | WARN | `<RULE_NAME>` — unresolved template variable |
| placeholder-token | WARN | `<DESCRIPTION_OF_BENIGN_PATTERN>` — unresolved template variable |
| placeholder-token | WARN | `<PROPOSED_PREDICATE>` — unresolved template variable |
| declared-tool-not-mentioned | WARN | `platform.core.generate_esql` declared in `toolIds` but absent from content |
| mentioned-tool-not-declared | info | (3 additional undeclared tool refs) |

**Assessment:** Has the highest lint warning count (4 WARNs). Three placeholder tokens indicate the content was not fully instantiated before registration. The `declared-tool-not-mentioned` warning for `platform.core.generate_esql` means the registry contract claims a capability the skill content does not reference — a mismatch that could confuse the routing layer. No eval suite exists.

---

### 3.7 `threat-hunting`

**Lint:** 9 × info  
**Similarity:** max non-self score = `alert-analysis` 0.120 (LOW — no collision)  
**Tooling inspect:** 0 scanned files, 0 tools returned

| Lint finding | Severity | Detail |
|---|---|---|
| mentioned-tool-not-declared | info | `platform.core.list_indices` |
| mentioned-tool-not-declared | info | `endpoint.events.process` |
| mentioned-tool-not-declared | info | `endpoint.events.network` |
| mentioned-tool-not-declared | info | `platform.core.get_index_mapping` |
| mentioned-tool-not-declared | info | `platform.core.generate_esql` |
| mentioned-tool-not-declared | info | `platform.core.execute_esql` |
| mentioned-tool-not-declared | info | `platform.core.search` |
| mentioned-tool-not-declared | info | `platform.core.cases` |
| mentioned-tool-not-declared | info | (additional undeclared ref) |

**Assessment:** Content is healthy (3 714 chars, 515 words). The 9 undeclared tool references are the highest count in the security skill set, but all are info-level — the skill functions at runtime. The registry contract is significantly incomplete relative to the tools actually exercised. No eval suite exists.

---

## Section 4: Active Plan Reconciliation

> Plans discovered via `treadmill_list_plans` filtered on keywords: `evals`, `alerts`, `detection`, `entity-analytics`, `skill`.

### Plans directly touching security skills eval infrastructure

| Plan ID | Status | Feature Group | Completion | Overlap with audit findings |
|---|---|---|---|---|
| `security-skills-eval-audit-write-document` | **active** | `security-skills-quality-loop` | in progress | This document |
| `security-skills-eval-infrastructure-audit` | paused | `security-skills-quality-loop` | 19 tasks / original design | Parent plan; produced the audit design spec |
| `entity-analytics-evals-wire-baseline-observability` | paused | `evals-entity-analytics-v2-uplift` | ~7% (1 task failed substance check) | Wires `createSkillInvocationEvaluator` + trace-based evaluators into `kbn-evals-suite-entity-analytics`; addresses Section 2 gap for entity-analytics |
| `entity-analytics-evals-baseline-observability` | draft | `evals-entity-analytics-v2-uplift` | 0% | Predecessor draft; superseded by wire plan |
| `evals-entity-analytics-v2-baseline-evaluators` | draft | `evals-entity-analytics-v2-uplift` | 0% | Predecessor draft; superseded |
| `extend-kbn-evals-to-support-agent-builder-skills-a` | draft | — | 0% | Adds `SkillEvaluator` class to `@kbn/evals` framework; would enable skill-aware suites across all security skills |

### Plans adjacent to security skills quality (alerts-RAG, detection emulation)

| Plan ID | Status | Feature Group | Relevance |
|---|---|---|---|
| `alerts-rag-kbn-evals-parity-phase-1-quantitative-correctness` | (status not fetched) | alerts-rag-quality | Adopts `@kbn/evals` quantitative correctness evaluator in alerts RAG suite; indirectly relevant — establishes evaluator precedent |
| `recalibrate-alerts-rag-evaluators` | draft | alerts-rag-quality | Evaluator recalibration; pattern applicable to security skill suites |
| `lift-small-model-alerts-rag-performance` | draft | alerts-rag-quality | Model performance; out of scope for eval infra |
| `detection-emulation-skill-epic-15974-orchestration-layer` | (status not fetched) | — | Epic 15974 detection emulation skill; may produce new eval surface |
| `port-kbn-evals-local-orchestrator-benchmark-registry-into-el` | (status not fetched) | — | Local orchestrator port; could affect how suites are invoked |

**Key gap:** No active or draft plan addresses `detection-rule-edit` empty content, `fp-rule-triage`/`fp-rule-tuning` placeholder tokens, or creation of eval suites for `alert-analysis`, `find-security-ml-jobs`, `fp-rule-triage`, `fp-rule-tuning`, or `threat-hunting`.

**Plan dependency note:** `entity-analytics-evals-wire-baseline-observability` is blocked at its first task (substance check failed). Before resuming it, the `entity-analytics` skill content defect (5-word body) should be addressed — wiring evaluators against a near-empty skill surface will produce misleading pass rates.

---

## Section 5: Prioritized Triage List

> Priority ranks: 0 = HARD-BLOCK | 1 = WARNING | 2 = missing suite | 3 = lint ERROR | 4 = lint WARN  
> Criticality modifier applied for skills with active users or dependent plans.

| Priority | Item | Severity | Affected Asset | Recommended Action |
|---|---|---|---|---|
| 1 | `detection-rule-edit` skill content is empty | lint ERROR (rank 3, boosted: only suite exists) | `detection-rule-edit` skill + `kbn-evals-suite-security-ai-rules` | Write skill content grounding agent behavior; current suite runs against empty instructions |
| 2 | `entity-analytics` skill content is 5 words | lint WARN (rank 4, boosted: active plan depends on it) | `entity-analytics` skill + `kbn-evals-suite-entity-analytics` | Expand skill content before resuming `entity-analytics-evals-wire-baseline-observability`; suite results are meaningless against near-empty grounding |
| 3 | 5 skills have no eval suite | missing suite (rank 2) | `alert-analysis`, `find-security-ml-jobs`, `fp-rule-triage`, `fp-rule-tuning`, `threat-hunting` | Create eval suites following `kbn-evals-suite-pci-compliance` reference pattern; highest-impact gap since 5/7 skills are blind to regression |
| 4 | `createSkillInvocationEvaluator` absent from 5 suites | WARNING (rank 1) | all suites except pci-compliance | Wire `createSkillInvocationEvaluator` + `traceEsClient` following pci-compliance reference; blocked on `extend-kbn-evals-to-support-agent-builder-skills-a` draft plan for non-pci suites |
| 5 | `createTrajectoryEvaluator` absent from all 6 suites | WARNING (rank 1) | all 6 suites | Add trajectory evaluator to all suites; requires `extend-kbn-evals-to-support-agent-builder-skills-a` plan to land first |
| 6 | Silent error-swallow in entity-analytics suite | code bug | `kbn-evals-suite-entity-analytics` lines 292-295 | Remove empty catch block; surface errors to the eval run so failures are counted rather than silently ignored |
| 7 | `fp-rule-tuning` has 3 unresolved placeholder tokens | lint WARN (rank 4) | `fp-rule-tuning` skill | Replace `<RULE_NAME>`, `<DESCRIPTION_OF_BENIGN_PATTERN>`, `<PROPOSED_PREDICATE>` with real content or parameterize via skill variables |
| 8 | `fp-rule-triage` has 1 unresolved placeholder token | lint WARN (rank 4) | `fp-rule-triage` skill | Replace `<RULE_NAME>` at line 83 |
| 9 | `fp-rule-tuning`: declared tool `platform.core.generate_esql` not mentioned in content | lint WARN (rank 4) | `fp-rule-tuning` skill | Either add usage instructions for `generate_esql` to content or remove from `toolIds` |
| 10 | `EVALUATION_REPETITIONS` hardcoded to 1 in all suites | WARNING (rank 1) | all 6 suites | Expose env-var hook; even a default of 3 repetitions would surface stochastic failures |
| 11 | `entity-analytics-evals-wire-baseline-observability` plan stalled | plan blocked | entity-analytics eval infra | Unblock by fixing entity-analytics skill content first (item 2), then resume plan; one task failed substance check |
| 12 | All 7 security builtin skills have empty `toolIds` (partial) | info | all 7 skills (except fp-rule-triage/fp-rule-tuning partially) | Audit and populate `toolIds` for tools mentioned in skill content; currently only `fp-rule-triage` and `fp-rule-tuning` have any declarations |
| 13 | No ES connectivity at audit time | infra | evaluation run history | ES must be running for `evaluation.list-runs` to return recency data; all `last_run` / `within_30_days` values were null during this audit |

---

## Appendix: Data Collection Method Notes

**MCP actions executed:**
- `skill.list` → returned 7 builtin security skills (Agent Builder API unreachable; user skills excluded)
- `evaluation.find-suites` per skill_id → 0 hits (scan capped at 5 000 files); resolved by direct filesystem reads of `evaluate_dataset.ts` files
- `evaluation.results` per suite_id → `fetch failed` (ES offline); all run recency data null
- `evaluation.gate-evaluator-stack` per suite → 6 × WARNING, 0 × HARD-BLOCK
- `tooling.inspect` per skill → all returned 0 scanned files / 0 tools (empty `toolIds` arrays)
- `skill.lint` per skill → 7 skills linted; results as documented in Section 3
- `skill.similarity` per skill description → 0 collisions above 0.55 threshold
- `treadmill_list_plans` + `treadmill_get_plan` → 11 plans with matching keywords reviewed

**Filesystem reads executed (to supplement API gaps):**
- `kbn-evals-suite-pci-compliance/src/evaluate_dataset.ts`
- `kbn-evals-suite-entity-analytics/src/evaluate_dataset.ts`
- `kbn-evals-suite-attack-discovery/src/evaluate_dataset.ts`
- `kbn-evals-suite-endpoint/src/evaluate_dataset.ts`
- `kbn-evals-suite-security-automatic-migrations/src/rules/evaluate_dataset.ts`
- `kbn-evals-suite-security-ai-rules/src/evaluate_dataset.ts`
