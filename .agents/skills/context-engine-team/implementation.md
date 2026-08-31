# Implementing a Context Engine issue

Once an issue exists (see [creating-issues.md](./creating-issues.md)), this is how to build it to the team's bar. Pair it with [conventions.md](./conventions.md) (the rules), [interfaces.md](./interfaces.md) (the contracts), and [creating-prs.md](./creating-prs.md) (how to ship it).

**The standard is high.** The Context Engine is a large, long-lived platform. Ship production-quality code — no shortcuts, no throwaway hacks, nothing you would not want another engineer to inherit and maintain. "It works" is not the bar; "it's correct, tested, and clear" is.

---

## Before you write code

- Read the issue's four sections. **Hard product requirements** are the contract; **Decisions taken** are settled — don't relitigate them; **⚠️ OPEN** items are yours to resolve (with the user).
- Read `architecture.md` / `interfaces.md` / `conventions.md` for the area you're touching, and **follow the existing patterns in the target files first**.
- Confirm scope. If the work is bigger than one reviewable PR, plan the split (`creating-prs.md`) before starting, and build bottom-up.

## Work with the user (default: collaborate)

Unless explicitly told to run autonomously, treat the user as a partner:

- **Ask clarifying questions the moment something is ambiguous — never guess.** Read more code first; if still unsure, ask with short, concrete options.
- **Surface every real decision** (an ⚠️ OPEN item, a design fork, a tradeoff) via **AskUserQuestion / plan mode** and let them choose. Don't silently pick a direction on anything that changes an API, the data model, the UX, or a dependency.
- If you *are* told to run autonomously, still **record the decisions you made and their alternatives** so they can be reviewed.

## Use subagents when it makes sense

Delegate to keep momentum and your context clean:

- **Parallel research** across subsystems/files (fan-out reads) — keep the conclusion, not the file dumps.
- **Independent implementation chunks** that don't share state (use worktree isolation if they'd otherwise conflict).
- **Adversarial review / verification** of your own work before you commit.

Don't delegate something you can do faster inline, and don't fan out work that has hidden ordering dependencies.

## Quality bar — no shortcuts

- Follow `conventions.md` exactly (dependency direction, feature flag, storage/service patterns, i18n, file layout).
- **Fix the root cause, not a band-aid.** No `any`, `@ts-ignore`, or `eslint-disable` to make something pass — fix the underlying issue.
- **No dead code, no commented-out blocks, no "TODO and move on".** Make focused changes; no unrelated drive-by refactors.
- Keep commits small and coherent; commit only when the change is complete and green.

## Comments discipline

- **Minimal inline comments.** Code should read for itself — do **not** narrate *what* it does.
- Comment only where a reader would otherwise miss something: a non-obvious **why**, a subtle invariant, a workaround for an external quirk, or a documented gotcha. No large block comments explaining mechanics the code already shows.
- **Exception — public interfaces are fully documented inline.** Exported functions/types, plugin setup/start contracts, route handlers, and package entry points get complete TSDoc (purpose, params, return, and any contract/caveat). Internal helpers do not.

## Always validate — before every commit and PR

Nothing is "done" until it's green. Build/verify with **Node 24** (`nvm use 24.18.0`):

- **Types:** `node scripts/type_check --project <plugin tsconfig>` (also the bridge plugin if you touched it).
- **Lint:** `node scripts/eslint <changed files>` (`--fix` for prettier; don't pass `.jsonc`).
- **i18n:** `node scripts/i18n_check`.
- **Tests — write them as you go, and run them:**
  - Unit-test the **pure logic** and **registration presence** (Jest).
  - API/UI via **Scout**.
  - **Never skip, comment out, or weaken a test to make it pass — fix the code.**
- Run the changed-scope gate before pushing: `node scripts/check.js --scope=branch` (or `staged`).
- Use the **Flaky Test Runner** on any new/changed tests.

## Keep this skill up to date (important)

The files in this skill (`architecture.md`, `interfaces.md`, `conventions.md`, the workflow guides, `data/`, prompts, scripts) are **living documentation for future AI agents**. They are only useful if they match reality — stale docs actively mislead.

- When your change makes any of these files wrong or incomplete — a route/schema/contract changed, a convention shifted, a MERGED-vs-PoC status flipped, a new pattern or gotcha emerged — **update the affected skill file in the same PR**.
- If you notice something out of date that you did **not** author this session, **fix it anyway** (or flag it to the user if the correction is non-trivial). Don't leave known-stale docs behind because "it wasn't my change."
- Treat the skill as part of the definition of done: a change that leaves the docs inconsistent is not finished.

## Definition of done

- All hard requirements met; every ⚠️ OPEN item resolved with the user.
- Follows `conventions.md`; public interfaces documented; comments minimal and meaningful.
- `type_check` + `eslint` + `i18n_check` + tests all green locally.
- The PR is one reviewable chunk with the right reviewers (`creating-prs.md`), and passes a self-review against `review-prs.md`.
- This skill's docs are updated to match the change — nothing left stale.
