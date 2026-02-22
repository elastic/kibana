---
name: scout-best-practices-reviewer
description: Use when writing and reviewing Scout UI and API test files.
---

# Scout Best Practices Reviewer

## Overview

- Identify whether the spec is **UI** (`test`/`spaceTest`) or **API** (`apiTest`) and review against the relevant best practices.
- Keep feedback concise and actionable: focus on correctness, flake risk, and CI/runtime impact.
- Report findings ordered by severity and include the matching best-practice heading (from the reference) next to each finding.

## References

Open only what you need:

- Review checklist (tagging, structure, auth, flake control, Playwright best practices): `references/scout-best-practices.md`

## Playwright Review Criteria

When reviewing UI test files, additionally check:

1. **`eslint-disable` comments**: flag **every** `eslint-disable playwright/*` comment — each one must be removed and the violation properly fixed. See the rule-by-rule fix guide below.
2. **Locators**: prefer `testSubj` / `getByRole` / `getByLabel` over CSS/XPath/DOM hierarchy
3. **Assertions**: must be web-first (auto-retrying) — flag `expect(await ...)` patterns (`prefer-web-first-assertions`)
4. **No manual waits**: flag `waitForTimeout`, `setTimeout`, `new Promise(r => setTimeout(...))` (`no-wait-for-timeout`)
5. **No `.first()` / `.nth()` / `.last()`**: these violate `no-nth-methods` — suggest more specific locators or adding `data-test-subj` to the source component
6. **No nested describe**: max depth is 1 (`max-nested-describe`) — suggest `test.step()` or splitting into separate files
7. **No conditional expects**: flag `expect` inside `if`/`else` (`no-conditional-expect`) — assert deterministic state directly
8. **Actions auto-wait**: flag redundant `waitFor` before `click`/`fill` calls
9. **Page objects**: confirm selectors/interactions are in page objects, assertions in specs
10. **`force: true`**: only acceptable with a documented reason for the overlay/interception
11. **Readable selectors**: flag inline multi-step locator chains — they must be extracted to named `const` variables or page object methods so the intent is clear to the reader
