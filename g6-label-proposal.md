# G6 label proposal — contested golden labels in kbn-evals-suite-detection-watch-rule-tuning

PR #290665 (branch `az/rule-tuning-suite-port`). This table documents the label
dispute for sign-off by Seth/Andrew. **No gold label is changed by this PR**:
every fixture below keeps its current label; `CONTESTED_FIXTURE_IDS`
(src/constants.ts) lists these 17 ids and `ChangeTypeAccuracyUncontested`
scores them N/A so both accuracy numbers are reported side by side until the
dispute is resolved.

Evidence base: upstream main `e25202cf957`. Fact 1 — the exception payload and
operator grammar the review's `apply_exception` step builds is
`security_solution/server/workflows/utils/exception_item.ts:38-119`
(`ExceptionItemStepAction`, `toApiEntries`, `toCreateExceptionItemBody`,
`createExceptionItemForRule`); it is rule-type agnostic. Fact 2 — the diagnose
prompt ranks `exception` first in its stated order of preference
(`rule_tuning_review.yaml:341-343`) and applies exceptions on every rule type
including new_terms (`create_new_terms_alert_type.ts:117,141`); only the
backtest preview is type-gated (`can_preview_query_change`,
`rule_tuning_review.yaml:614-633`).

| Fixture | Current label | Proposed | Evidence |
|---|---|---|---|
| fp-volume-suppression | manual | exception | Repeated benign process on identifiable entities; prompt's preference order (rule_tuning_review.yaml:341) ranks exception above manual for known-good entities |
| fp-suppression-healthcheck | manual | exception | Single known-good entity re-firing (curl); exception_item.ts applies exceptions rule-type-agnostically |
| fp-suppression-vulnscan | manual | exception | Same single-entity suppression shape as healthcheck |
| fp-suppression-inventory | manual | exception | Same single-entity suppression shape as healthcheck |
| fp-suppression-patchagent | manual | exception | Same single-entity suppression shape as healthcheck |
| fp-suppression-logship | manual | exception | Benign filebeat re-firing from ONE entity — identical shape to the contested suppression family above (added 2026-10-09) |
| fp-suppression-incapable-rule-type | manual | exception | 5 identical single-entity alerts on a new_terms rule; new_terms exceptions ARE applied by the runtime (create_new_terms_alert_type.ts:117,141), so `manual` is not forced by the rule type (added 2026-10-09) |
| fp-low-value-risk | risk_score | exception | Alerts real but low-value; exception outranks risk_score in the preference order when entities are identifiable |
| fp-low-value-scripting | risk_score | exception | Same low-value family shape |
| fp-low-value-admin-tools | risk_score | exception | Same low-value family shape |
| fp-low-value-devtools | risk_score | exception | Same low-value family shape |
| fp-low-value-remote-support | risk_score | exception | Same low-value family shape |
| fp-low-value-archive | risk_score | exception | Same low-value family shape |
| fp-manual-newterms-dns | manual | exception | Novel-term judgement call; runtime applies exceptions on new_terms, so manual is not forced |
| fp-manual-newterms-proxy | manual | exception | Same new_terms family shape |
| fp-manual-newterms-vpn | manual | exception | Same new_terms family shape |
| fp-manual-newterms-ntp | manual | exception | Same new_terms family shape |

Counts: 17 contested / 39 total (22 uncontested). The uncontested subset still
labels `threshold` and `schedule` (asserted in coverage_characterization.test.ts).

Known-weak label to watch: `fp-schedule-stale-logins` — its schedule label
relies on the seeded alert spread reading as routine recurrence rather than a
burst; if live-stack runs show the model reading it as threshold-shaped, this
label is the first to re-examine.
