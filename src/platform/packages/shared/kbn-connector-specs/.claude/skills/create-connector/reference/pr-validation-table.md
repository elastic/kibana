# PR Validation Table

Every connector PR — whether opened by an agent or handed off to a human to open — must include a
`## Validated` section in its description. This section exists so a reviewer (human or agent) can see,
at a glance, which actions have actually been confirmed to work against the real service, and which
still need manual verification before merge. It is a checklist, not just a report of successes.

## Format

```markdown
## Validated

<One sentence on how testing was performed, e.g. "Every action was exercised end-to-end against a live
Sentry trial org" or "Live testing was deferred for this connector; the table below lists every action
as a manual verification checklist.">

| Action               | What was tested                                                   | Result                                    |
| -------------------- | ------------------------------------------------------------------ | ------------------------------------------ |
| test (connectivity)  | <what credential/config was used>                                  | ✅ Pass                                    |
| <actionName>         | <concrete scenario exercised — real inputs, not "called the action"> | ✅ Pass                                    |
| <actionName>         | <what would need to be tested>                                     | ⚠️ Not validated — needs manual verification |
| <actionName>         | <what was tried and what failed>                                   | ❌ Fail — <short reason, link to follow-up if any> |
```

## Rules

- **Include every action** defined in the spec's `actions` map, plus the connectivity `test` handler if
  one exists. Do not omit an action because it wasn't tested — list it with an honest status instead.
- **One row per action.** Do not group actions together in a single row, even if they're similar (e.g.
  `resolveIssue`/`ignoreIssue`/`unresolveIssue` each get their own row) — a reviewer needs to know the
  status of each individually.
- **If an action was exercised live** (via a chat test in `build-connector` Task 7/11, direct API calls
  during `activate-connector`/manual testing, or equivalent), describe the *specific* scenario in the
  "What was tested" column (e.g. "Assign to a real org member by email; confirmed invalid formats
  correctly 400" — not "called the assign action"). Mark it `✅ Pass`.
- **If testing an action surfaced and fixed a bug**, say so briefly in the Result column (e.g. `✅ Pass
  (after fixing query-param encoding)`). This creates a paper trail connecting a fix commit to the
  concrete symptom it addressed, which is useful for reviewers and for future connectors hitting the
  same class of bug.
- **If an action could not be exercised** — live testing was deferred for this connector, credentials for
  a destructive/admin-only action weren't available, the scenario requires state that's hard to set up
  (e.g. a paid tier feature) — mark it `⚠️ Not validated — needs manual verification` and say briefly why.
  Never mark something `✅ Pass` without having actually observed it work.
- **If an action failed and the failure is unresolved**, mark it `❌ Fail`, describe what broke, and link
  to a follow-up issue or note if it's a known limitation rather than silently dropping the row.
- **At least one live-tested action must use hostile inputs, not just happy-path alphanumerics** —
  a value containing characters that stress encoding and signing: a wildcard (`logs-*`), spaces,
  quotes, `! ' ( )`, `=` inside a value, or unicode. Encoding/canonicalization bugs (URL building,
  query serialization, request signing) pass every plain-alphanumeric test and then fail live as
  generic vendor errors — a `logs-*` index pattern is exactly what exposed a SigV4 signing bug that
  had survived a full happy-path validation pass. Note which row covered this (e.g. `✅ Pass
  (including wildcard searchString)`); if no action can safely take such input, say so under the table.
- Place the `## Validated` section directly above `## Test plan` in the PR body.

## When live testing is fully deferred

If the whole connector's live verification (`build-connector` Tasks 4–11) was skipped or deferred — e.g.
the user asked to batch-build several connectors' code first and defer testing — the table must still be
generated and included in the PR, with every row marked `⚠️ Not validated — needs manual verification`.
Do not skip the section just because there's nothing to report yet; a human still needs the checklist to
know what to click through before merging.

## Reference example

See the Sentry connector PR ([elastic/kibana#281136](https://github.com/elastic/kibana/pull/281136))
`## Validated` section for a fully worked example: 14 actions plus the connectivity test, each with a
concrete scenario and outcome, including several rows noting bugs found and fixed during that pass.
