# Handoff: ML jobs modal blocks or silently fails prebuilt rule upgrades

Two related bugs, both now fixed on the `fix-ml-rule-upgrade` branch (draft [PR #279931][pr]). The GitHub tickets carry the problem statements and root causes; this doc adds what they leave out: what shipped, what is left, and how to reproduce.

## Links

- Draft [PR #279931][pr]
- [Bug 1: modal on every upgrade][b1]
- [Bug 2: rule details page silent failure][b2]
- [Related internal SDH][sdh]
- [Team Slack thread][slack]
- Full Option E design: `~/.claude/plans/tidy-crafting-lagoon.md`
- Steven de Salas' external write-ups, context only: [rule details silent failure][sds1], [modal blocks upgrades][sds2]

## People

- **Kseniia Ignatovych** - PM, approved Option E, co-assignee on [Bug 1][b1].
- **Austin Eakin** - Solutions Engineer, reported it for the customer, can provide a live repro.
- **Steven de Salas** - initial external analysis.

## The bugs

Both fire under the same condition: at least one installed anomaly-detection ML job whose id is in the legacy allowlist [`affected_job_ids.ts`][affected]. Neither reproduces on a clean stack.

- **[Bug 1][b1]:** the "ML rule updates may override your existing rules" modal gated every prebuilt rule upgrade, even non-ML rules, and re-prompted on each one.
- **[Bug 2][b2]:** on the rule details and rule edit pages that modal was never mounted, so its confirmation Promise never resolved and "Update rule" silently did nothing.

## What shipped (Option E)

The blocking modal is gone. In its place, losing coverage from a legacy ML job now surfaces as a prebuilt-rule three-way-diff conflict on the `machine_learning_job_id` field. Full design and locked decisions live in `~/.claude/plans/tidy-crafting-lagoon.md`.

- **Server.** A custom three-way-diff algorithm for `machine_learning_job_id` treats the field as an unordered set of job ids, so reordering ids or wrapping a single id in an array does not count as an update. When an upgrade would drop the user's legacy job, it forces a `NON_SOLVABLE` conflict whose merged value keeps the current job, so the safe default is "keep what you have." One shared pure helper backs both this and the client signal.
- **Client.** A narrow `hasMlCoverageLossConflict` signal, derived only from the ML field diff, drives a plain warning callout on every license tier. It no longer gates the upgrade, and the existing conflict gates are untouched.
- **Per-rule.** The row shows "Review", which opens the flyout. Below Enterprise the upgrade takes Elastic's target version; on Enterprise it stays gated on resolving the conflict in the resolver.
- **Banner.** The Rule Management page lists the installed legacy job ids in a dismissible, non-blocking callout, capped with a "view all" modal.
- **Bulk.** The conflicts modal is Enterprise-only. Below Enterprise, "Upgrade all" goes straight to Elastic's target version with no dry run and no modal. This is **Route A**. Coverage loss for those users shows up through the banner and the per-rule "Review" gate, not a bulk prompt.

## Testing

Coverage for the coverage-loss behavior spans three layers:

- **Unit.** The set-based `machine_learning_job_id` diff algorithm, the shared `isMlJobCoverageLossUpgrade` helper, and the client `hasMlCoverageLossConflict` signal, including the guard that a non-ML `NON_SOLVABLE` conflict does not trip the signal.
- **FE integration.** The Rule Details callout on both tiers, asserting the callout is informational with no acknowledgment checkbox and that below Enterprise the upgrade takes the target version. A new `upgrade_all_rules_route.test.tsx` covers bulk "Upgrade all" routing: below Enterprise it goes straight to target with no dry run or modal (Route A), on Enterprise it runs a dry run first.
- **E2e.** The dedicated `upgrade_with_legacy_ml_jobs.cy.ts` runs at trial (Enterprise), resolving the conflict from the upgrades table and the Rule Details page and asserting that bulk "Upgrade all" excludes the coverage-loss rule while upgrading the others. Cypress cannot set Platinum, so the below-Enterprise UX is covered by the integration tests above rather than e2e.

Test plans live under `.../docs/testing/test_plans/detection_response/prebuilt_rules/`:

- New `prebuilt_rule_upgrade_with_legacy_ml_jobs.md` collects every coverage-loss scenario, split by tier.
- `prebuilt_rule_upgrade_diff_algorithms.md` gained the `machine_learning_job_id` algorithm scenarios.
- `prebuilt_rule_upgrade_notifications.md` was reverted to its ML-free state; its earlier ML scenarios were inaccurate and now live in the dedicated plan.

## Status

CI is green: Buildkite [build 476685][ci] passed the full suite on the pushed commit, before the test additions in [Testing](#testing). Verified by hand on a live stack at both Platinum (ML on, customization off) and trial (Enterprise-equivalent). Local eslint, i18n, and the touched Jest and integration suites pass, including the new coverage-loss tests. The full-plugin typecheck is left to CI, since it takes over ten minutes locally.

The branch is pushed. The working tree also carries this handoff doc, the [temporary seeder wiring](#before-merge-after-approval), and the new tests and test plans from [Testing](#testing); commit and push those, then re-run CI.

## What is left

The behavior, its tests, and the test plans are done (see [Testing](#testing)). What remains is **PR readiness**: write the description, screenshots, and release note, commit and push the test additions, then flip the draft to ready-for-review.

### Before merge, after approval

Both steps are held back on purpose so reviewers can reproduce the fix straight from the branch. Do not do them while the PR is under review.

1. **Revert the seeder demo wiring.** `scripts/quickstart/scratchpad.ts` calls `seedMlCoverageLossState` in place of its original example content (marked `TEMPORARY`). Restore it from `main`: `git checkout main -- x-pack/solutions/security/plugins/security_solution/scripts/quickstart/scratchpad.ts`. Keep the `modules/ml_coverage_loss/` module and its README; only the `scratchpad.ts` wiring is temporary.
2. **Delete this handoff doc.**

## Background: what `affected_job_ids.ts` is

[`affected_job_ids.ts`][affected] is a hand-maintained allowlist of superseded Security ML job ids: older job generations that the current prebuilt ML rules no longer reference. It answers one question, "does this user still have an older-generation job installed?", and it is a moving target that changes most releases. The real rule-to-job wiring lives upstream in the detection-rules repo, not here.

Why the warning matters: upgrading a prebuilt ML rule silently repoints it from the legacy job the user has installed to a new-generation job. If that legacy job was providing coverage, the upgraded rule now points elsewhere and the old job is orphaned, a silent coverage gap. Option E surfaces that repoint as a conflict. The trigger is content-based, computed on the server from the rule's current versus target `machine_learning_job_id`, so unlike the old modal it does not depend on which jobs are installed or on ML privileges.

The allowlist now has two consumers: the Rule Management banner, and the shared coverage-loss helper used by both the client signal and the server diff.

## Reproducing and verifying

You need an installed anomaly-detection job whose id is in [`affected_job_ids.ts`][affected]. Two ways in:

- **UI or e2e:** install a Security anomaly-detection job with an allowlisted id. Stock ML modules now install only modern `_ea` jobs, so the legacy job has to be created explicitly. The quickstart seeder below is the fastest path.
- **Unit or integration:** mock `useInstalledSecurityJobs` to return a job whose id is in the allowlist.

**Quickstart seeder.** `scripts/quickstart/modules/ml_coverage_loss/` seeds a legacy ML job plus a set of upgradeable prebuilt-rule fixtures covering the coverage-loss, customized, clean, and non-ML cases, then logs a PASS/FAIL table. See its README for the specifics. It writes assets directly to the `.kibana_security_solution` system index, so run it as a user with the `system_indices_superuser` role rather than the default `elastic` superuser. On a basic-license stack pass `{ createMlJob: false }`; the conflict is content-based and reproduces without the job installed. Pass `{ installAllAffectedJobs: true }` to exercise the banner's "view all" modal.

**License tiers.** `yarn es snapshot --license` only takes `basic` or `trial`, and trial behaves as Enterprise. The interesting middle tier is Platinum, where ML is available but customization is off: start ES on trial, then POST a signed Platinum dev license to `/_license?acknowledge=true`. Signed test licenses are on the [Elastic wiki][wiki]. ML rules need Platinum; prebuilt-rule customization needs Enterprise.

**Verification commands.**

- Unit: `node scripts/jest <testPathPattern>`.
- Front-end integration: `__integration_tests__` is skipped by the default jest config, so run it with `node scripts/jest_integration --config <.../rules_upgrade/jest.integration.config.js> <pattern>`.
- Lint and i18n: `node scripts/eslint --fix $(git diff --name-only)` and `node scripts/i18n_check --fix`.
- Everything at once: `node scripts/check.js --scope=branch`.
- Types: prefer per-file IDE diagnostics; skip the full-plugin `type_check`, since CI runs it.

The canonical worked example is the e2e spec `upgrade_with_legacy_ml_jobs.cy.ts`.

[pr]: https://github.com/elastic/kibana/pull/279931
[b1]: https://github.com/elastic/kibana/issues/239884
[b2]: https://github.com/elastic/kibana/issues/279791
[sdh]: https://github.com/elastic/sdh-security-team/issues/1698
[slack]: https://elastic.slack.com/archives/C0B7YAUDDB5/p1784225323593619
[ci]: https://buildkite.com/elastic/kibana-pull-request/builds/476685
[wiki]: https://elasticco.atlassian.net/wiki/x/3ifKAg
[sds1]: https://github.com/sdesalas/kibana-knowledge/blob/main/reports/rule-details-update-silently-fails-with-legacy-ml-jobs.md
[sds2]: https://github.com/sdesalas/kibana-knowledge/blob/main/reports/ml-jobs-upgrade-modal-blocks-all-rule-upgrades.md
[affected]: x-pack/solutions/security/plugins/security_solution/common/machine_learning/affected_job_ids.ts
