---
name: scout-eui-test-helpers-migration
description: Use when migrating Kibana Scout tests onto the published EUI test helpers (`@elastic/eui-test-helpers`), or reviewing such migrations — including when a test uses an old in-repo wrapper method the minimal helper doesn't expose, or when deciding whether to adapt a test, request a helper addition, or move a check to an API/unit test.
disable-model-invocation: true
---

# Migrating Scout tests to the EUI test helpers

## What these helpers are

The EUI test helpers exist so every Kibana test drives a given EUI component the same reliable way, instead of each suite hand-rolling its own brittle selectors — keeping tests stable across EUI upgrades and letting a single fix in a helper benefit every consumer.

`@elastic/eui-test-helpers` ships **Component Objects** — wrappers around a Playwright `Locator` for one EUI component. Scout exposes them via a factory, e.g. `page.components.comboBox(testSubj, scope?)`, returning a small set of methods to set up and read that component's state.

The API is deliberately small — a few broad methods, not one per interaction. That's the whole reason migrating is a judgment call rather than a 1:1 method map (next section). The rationale behind that minimalism lives in EUI, not here (see References).

## Judge the test — don't mirror the old API

In-repo wrappers accrete many narrow methods; the helper has few broad ones. Do not 1:1-map them. A method missing from the helper is **not** evidence it should be added — it's a prompt to re-examine the test. For each old-API call, stop at the first rule that applies:

1. **Is the test valid / in e2e scope?** Not all tests are good tests. Fix or drop a bad assertion instead of preserving it through a new helper method.
2. **Can an existing method express it?** Most narrow methods collapse into the minimal set (select-one / select-many / read / clear → a couple of set-based methods). Adapt the test to the simpler API — this covers the large majority of cases.
3. **Does it belong at a lower layer?** Move it to an API/unit test (see below).
4. **Only if none apply and the need recurs across tests** — request a helper addition (see _When the helper doesn't cover your case_).

## Don't assert data correctness through the UI

Anti-pattern: call an API, get a value, then assert it appears in the component. In e2e we trust the lower layers — that check belongs in an API or unit test; re-checking it through the DOM is slow, flaky, and redundant.

**Exception:** when non-trivial client-side wiring sits between the data and the render (the UI transforms it, cross-links it with other state, derives what's shown), verifying the rendered result _is_ valid e2e coverage — only an end-to-end flow exercises that logic. Judge by how much UI logic sits between the data and the pixels.

## When the helper doesn't cover your case

The published helper won't cover everything. Roughly in order of preference:

- **Adapt the test** to the helper's existing methods, or move the check to a lower layer — this resolves most gaps (see the decision ladder above).
- **Request it — don't roll your own** — for a genuine, reusable need the helper doesn't cover, ask the DevEx team to add it: open an issue on [`elastic/eui`](https://github.com/elastic/eui/tree/main/packages/test-helpers) (the helpers live in `packages/test-helpers`), or ping DevEx on Slack. Don't extend the helper yourself (no local subclass or one-off methods) — they decide whether it belongs in the helper. Migrate what maps now; defer what doesn't, with a note.
- **Keep it in the test, rarely** — if the need is genuinely one-off and test-specific (not worth a shared method), leave the interaction as plain Playwright in the spec. The exception, not a habit.

## Reading collections: account for virtualization

Never assume the whole collection is in the DOM. Combo box, data grid, and selectable use **virtual scrolling** that mounts/unmounts items, so "return all items" silently misses entries.

- Prefer **exact-text lookups** ("is X present / select X") over "list everything."
- A test that truly needs the full list is a signal to reconsider its scope — is that assertion really e2e?

## Worked example: `EuiComboBox`

Old in-repo `EuiComboBoxWrapper` (~10 methods) → published `EuiComboBoxObject` (a handful of auto-detecting methods: `setSelectedOptions` / `setCustomSelectedOptions` / `getSelectedOptions` / `getAvailableOptions` / `clear`), via `page.components.comboBox(...)`.

| Old wrapper call                                                | New                                                | Notes                                                  |
| --------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| `selectSingleOption(v)`                                         | `setSelectedOptions([v])`                          | Clean map.                                             |
| `selectMultiOption(v)` / `selectMultiOptions(vs)`               | `setSelectedOptions(vs)`                           | Set-semantics replaces the "already selected?" guards. |
| `getSelectedValue()` / `getSelectedMultiOptions()`              | `getSelectedOptions()`                             | One reader for single and multi.                       |
| clear-button click                                              | `clear()`                                          | Auto-detects the clearing strategy.                    |
| `removeOption(v)`                                               | `setSelectedOptions(current.filter(x => x !== v))` | Express the end-state, not the step.                   |
| `setCustom{Single,Multi}Option(v)` (free-text `onCreateOption`) | `setCustomSelectedOptions([v])`                    | Creates a free-text value via `onCreateOption`.        |

`setSelectedOptions` and `setCustomSelectedOptions` take an optional `{ timeout }` (default 2500ms) bounding how long each option is awaited after typing — raise it (e.g. a shared `EXTENDED_TIMEOUT`) for combos whose options load from the server, rather than dropping back to raw Playwright. `getAvailableOptions()` reads the unselected dropdown options for the rare test that must assert on the option list itself (mind virtualization — see above).

## Migration workflow (Scout)

1. **Inventory** every EUI-component usage in the spec and its page objects.
2. **Decide** each usage with the ladder above (_Judge the test — don't mirror the old API_); most collapse onto an existing helper method.
3. **Apply.** Clean cases: swap to the factory (`page.components.comboBox('subj')`). Anything that doesn't map cleanly: follow _When the helper doesn't cover your case_, and note in the PR why.
4. **Verify.** Run the spec once and confirm it fails when the behavior is broken — a single run catches the deterministic bugs a migration tends to introduce. Reach for the [Flaky Test Runner](https://ci-stats.kibana.dev/trigger_flaky_test_runner) only when the migration dropped a retry or wait, to prove it's no longer needed.

## FTR

FTR isn't Playwright, so there's no `page.components` factory. Migrate the FTR suite to Scout first, then adopt the helper in the Scout test. The judgment rules above apply regardless.

## References

- Helper design principles: EUI repo `packages/test-helpers/CONTRIBUTING.md` and `README.md`.
- Reference migration PR: [elastic/kibana#275609](https://github.com/elastic/kibana/pull/275609).
