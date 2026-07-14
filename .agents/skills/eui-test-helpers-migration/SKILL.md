---
name: eui-test-helpers-migration
description: Use when migrating Kibana Scout tests onto the published EUI test helpers (`@elastic/eui-test-helpers`), or reviewing such migrations — including when a test uses an old in-repo wrapper method the minimal helper doesn't expose, or when deciding whether to adapt a test, extend a helper, or move a check to an API/unit test.
---

# Migrating Scout tests to the EUI test helpers

## What these helpers are

`@elastic/eui-test-helpers` ships **Component Objects** — wrappers around a Playwright `Locator` for
one EUI component. Scout exposes them via a factory, e.g. `page.components.comboBox(testSubj, scope?)`.
Two facts drive everything below:

- **They set up and read component state so the test can focus on its real assertion.** They are not
  a way to test EUI's own behavior — EUI has its own suites for that.
- **They are minimal and configuration-agnostic by design.** One public method auto-detects the DOM
  and works across every prop variant (`clear()` handles pills vs. plain-text vs. dropdown itself).
  Expect ~3 broad methods, not ~10 narrow ones. Don't "fix" the minimalism by fattening the helper.

## Judge the test — don't mirror the old API

In-repo wrappers accrete many narrow methods; the helper has few broad ones. Do not 1:1-map them. A
method missing from the helper is **not** evidence it should be added — it's a prompt to re-examine
the test. For each old-API call, stop at the first rule that applies:

1. **Is the test valid / in e2e scope?** Not all tests are good tests. Fix or drop a bad assertion
   instead of preserving it through a new helper method.
2. **Can an existing method express it?** Most narrow methods collapse into the minimal set
   (select-one / select-many / read / clear → a couple of set-based methods). Adapt the test to the
   simpler API — this covers the large majority of cases.
3. **Does it belong at a lower layer?** Move it to an API/unit test (see below).
4. **Only if none apply and the need recurs across tests** — extend the helper (see *Keep the helper
   minimal*).

## Don't assert data correctness through the UI

Anti-pattern: call an API, get a value, then assert it appears in the component. In e2e we trust the
lower layers — that check belongs in an API or unit test; re-checking it through the DOM is slow,
flaky, and redundant.

**Exception:** when non-trivial client-side wiring sits between the data and the render (the UI
transforms it, cross-links it with other state, derives what's shown), verifying the rendered result
*is* valid e2e coverage — only an end-to-end flow exercises that logic. Judge by how much UI logic
sits between the data and the pixels.

## Keep the helper minimal — extend rarely

Too thin, and every test re-invents DOM-poking; too fat, and the helper becomes an unstable grab-bag
coupled to EUI internals. Bias thin. When something genuinely isn't covered:

- **Extend only when the need is valuable across multiple tests**, not to unblock one. A single
  caller → keep it local (a Kibana-side subclass) or adapt the test.
- **Prefer teaching an existing method a new auto-detected configuration** over adding a new public
  method — every public method is stable surface Kibana couples to.
- **Land helper additions as their own EUI PR.** Don't grow the helper inside a migration PR; it
  stalls the migration behind another review cycle. Migrate what maps; defer what doesn't, with a note.

## Reading collections: account for virtualization

Never assume the whole collection is in the DOM. Combo box, data grid, and selectable use **virtual
scrolling** that mounts/unmounts items, so "return all items" silently misses entries.

- Prefer **exact-text lookups** ("is X present / select X") over "list everything."
- A `getOptions`/`optionsList`-style method may *require* an explicit search term, because there are
  too many options and virtualization drops the target until you filter to it.
- A test that truly needs the full list is a signal to reconsider scope before adding an enumeration
  method.

## Worked example: `EuiComboBox`

Old in-repo `EuiComboBoxWrapper` (~10 methods) → published `EuiComboBoxObject` (3 auto-detecting
methods: `setSelectedOptions` / `getSelectedOptions` / `clear`), via `page.components.comboBox(...)`.

| Old wrapper call | New | Notes |
|---|---|---|
| `selectSingleOption(v)` | `setSelectedOptions([v])` | Clean map. |
| `selectMultiOption(v)` / `selectMultiOptions(vs)` | `setSelectedOptions(vs)` | Set-semantics replaces the "already selected?" guards. |
| `getSelectedValue()` / `getSelectedMultiOptions()` | `getSelectedOptions()` | One reader for single and multi. |
| clear-button click | `clear()` | Auto-detects the clearing strategy. |
| `removeOption(v)` | `setSelectedOptions(current.filter(x => x !== v))` | Express the end-state, not the step. |
| `setCustom{Single,Multi}Option(v)` (free-text `onCreateOption`) | `setSelectedOptions([v], { create: true })` | Types the value and commits it via `onCreateOption` (see below). |

Before/after (from [#275609](https://github.com/elastic/kibana/pull/275609)) — only the setup got
simpler; what the test verifies is unchanged:

```diff
-  this.comboBox = new EuiComboBoxWrapper(this.page, 'links--linkEditor--dashboardLink--comboBox');
+  this.comboBox = this.page.components.comboBox('links--linkEditor--dashboardLink--comboBox');
-  await this.comboBox.selectSingleOption(destination);
+  await this.comboBox.setSelectedOptions([destination]);
```

The base helper is minimal, so Kibana adds a thin `KbnComboBoxObject` subclass (what
`page.components.comboBox` returns) for what the base doesn't cover yet: free-text `onCreateOption`
via `setSelectedOptions([v], { create: true })`; server-side/virtualized search where the option
isn't in the DOM until you type (its `setSelectedOptions` types to filter, then selects by accessible
name); and `getAvailableOptions` for reading the *unselected* list. These are interim — they graduate
into the published helper via its own EUI PR, deleting the subclass with no test changes (same method
names). A couple of genuinely odd combos stay fully raw: e.g. virtualized + middle-truncated options
keyed by a stable option `data-test-subj`, and an `asPlainText` combo that defaults to a preset value.

## Migration workflow (Scout)

1. Inventory every EUI-component usage in the spec and its page objects.
2. Run the decision ladder on each usage.
3. Replace clean cases with the factory (`const cb = page.components.comboBox('subj')`); pass a
   `scope` `Locator`/Component Object for an instance inside a flyout/panel.
4. Leave justified exceptions as-is and note *why* in the PR; track a helper follow-up only if the
   need recurs.
5. Verify: run the test, and confirm it *fails* when the behavior is broken.

## FTR

FTR isn't Playwright, so there's no `page.components` factory. Migrate the FTR suite to Scout first
(see `scout-migrate-from-ftr`), then adopt the helper in the Scout test. The judgment rules above
apply regardless.

## References

- Helper design principles: EUI repo `packages/test-helpers/CONTRIBUTING.md` and `README.md`.
- Reference migration PR: [elastic/kibana#275609](https://github.com/elastic/kibana/pull/275609).
