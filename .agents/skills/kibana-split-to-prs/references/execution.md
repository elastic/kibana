# Execution and validation

## Validation timing

| Phase | Run check on slice? | Plan outcome |
|-------|---------------------|--------------|
| 1–3 | **No** | `not run — slice not materialized; run in Phase 5 after commit` |
| 5 | **Yes** — after commit | `pass` or `fail` (stop stack on fail) |

Do not claim checks passed during planning.

## Check gate (Phase 5)

After each slice commit:

```bash
node scripts/check --scope branch --base-ref upstream/main
```

Pass → proceed. Fail → stop; fix slice; re-run. Baseline: `upstream/main`.

Supplement commands: [AGENTS.md](../../../AGENTS.md) Testing section (`check_changes`, `jest`, `type_check`, `eslint`). Prefer `scripts/check` for the gate—do not substitute "CI will catch it" without naming deferred checks.

| PR type | Validation |
|---------|------------|
| Mechanical, unchanged | `scripts/check` |
| Behavioral | `scripts/check` + tests in PR |
| Dark-shipped (off) | `scripts/check` + tests for new path |
| Flip | `scripts/check`; often small diff |

---

## Approval gates

| Action | Requires |
|--------|----------|
| Split plan | — |
| Branches + commits | **execute split** |
| `git push` to `origin` | Explicit ask (never `upstream`) |
| Draft PRs | Explicit ask **after** slices exist |

Do not open draft PRs as a side effect of execute split.

## Stack bases

PR1 base `upstream/main`; PRn base branch for PR(n−1). After PR1 merges, retarget PR2 to `upstream/main` or rebase—note in plan if merging incrementally.

## Opening draft PRs

Push to **`origin`**, then:

```bash
gh pr create --draft --base <base> --head <head> --title "..." --body-file -
# PR2+: --base previous split branch until PR1 merges
```

Use review question + stack position in body. Draft until check passed on branch.
