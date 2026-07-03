---
name: eui-test-helpers-migration
description: >
  Migrate Kibana tests to the published EUI test helpers (`@elastic/eui-test-helpers` — the
  Component Objects like `EuiComboBoxObject`, exposed in Scout via `page.components.<component>(...)`).
  The helpers are intentionally minimal, so migration is a judgment task, not a mechanical rewrite.
  Use when: (1) migrating a Scout/RTL/Cypress test off an in-repo EUI component wrapper onto the
  published helper, (2) a test uses an old wrapper method the minimal helper doesn't expose,
  (3) deciding whether to adapt a test vs. extend a helper vs. move the check to an API/unit test,
  (4) adding or reviewing usage of any `EuiXxxObject` component object.
---

# Migrating tests to the EUI test helpers

## What these helpers are

`@elastic/eui-test-helpers` ships **Component Objects** — semantic wrappers around a Playwright
`Locator` (also usable from RTL/Cypress) for one EUI component. Scout exposes them via a factory,
e.g. `page.components.comboBox(testSubj, scope?)`. Two things drive everything below:

- **They set up and read component state so a test can focus on its real assertion** — they are not
  a way to test EUI's own behavior (EUI has its own RTL/Cypress/VRT suites for that).
- **They are deliberately minimal and configuration-agnostic:** one public method auto-detects the
  DOM and works across every prop variant (`clear()` figures out pills vs. plain-text vs. dropdown
  itself). Expect ~3 broad methods, not ~10 narrow ones. This minimalism is intentional — don't
  "fix" it by fattening the helper.

## Core principle: judge the test, don't mirror the old API

In-repo wrappers accrete many narrow methods; the helper has few broad ones. The wrong instinct is a
1:1 map that stalls the moment an old method has no equivalent. A missing method is **not** evidence
it should be added — it's a prompt to re-examine the test. For each old-API call, stop at the first
that applies:

1. **Is the test valid / in e2e scope at all?** Not all tests are good tests — fix or drop bad
   assertions rather than preserving them through a new helper method.
2. **Can an existing helper method express it?** Most narrow methods collapse into the minimal set
   (select-one / select-many / read / clear → a couple of set-based methods). Adapt the test to the
   simpler API. This unlocks the large majority of cases.
3. **Does it belong at a lower layer?** Move it to an API/unit test (see below).
4. **Only if none apply and the need recurs across tests** → extend the helper (see "Extending").

## e2e vs. API/unit (a test-validity check, not just a helper one)

Anti-pattern: call an API, get a value, then assert it appears in the component. **In e2e we trust
the lower layers** — re-checking data correctness through the DOM is slow, flaky, and redundant; that
assertion belongs in an API or unit test. *Exception:* when there's **non-trivial client-side wiring**
(the UI transforms the data, cross-links it with other state, derives what's shown), verifying the
rendered result *is* legitimate e2e coverage, because only an end-to-end flow exercises that logic.
Judge by how much UI logic sits between the data and the pixels.

## Keep the helper minimal — extend rarely

There's a balance: too thin and every test re-invents DOM-poking; too fat and the helper becomes an
unstable grab-bag coupled to EUI internals. Bias thin. When something genuinely isn't covered:

- **Extend only when reasonable and valuable across multiple tests**, not to unblock one. Single
  caller → keep it local (a Kibana-side subclass) or adapt the test.
- **Prefer teaching an existing method a new auto-detected configuration** over adding a new public
  method (each public method is stable surface Kibana couples to).
- **Land helper additions as their own EUI PR** — don't grow the helper inside a migration PR; it
  stalls the migration behind another review cycle. Migrate what maps; defer what doesn't with a note.

## Collections & virtualization (any read/enumerate method)

Never assume the whole collection is in the DOM. Combo box, data grid, and selectable use **virtual
scrolling** that mounts/unmounts items, so "return all items" can silently miss entries. Prefer
**exact-text lookups** ("is X present / select X") over "list everything" — a `getOptions`/
`optionsList`-style method may *require* an explicit search term precisely because there are too many
options and virtualization has dropped the target until you filter to it. A test that truly needs the
full list is a signal to reconsider scope before adding an enumeration method.

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
| `setCustom{Single,Multi}Option(v)` (free-text `onCreateOption`) | **no equivalent** | Genuinely missing — don't force a bad map (see below). |

Before/after (from [#275609](https://github.com/elastic/kibana/pull/275609)) — only the setup got
simpler; what the test verifies is unchanged:

```diff
-  this.comboBox = new EuiComboBoxWrapper(this.page, 'links--linkEditor--dashboardLink--comboBox');
+  this.comboBox = this.page.components.comboBox('links--linkEditor--dashboardLink--comboBox');
-  await this.comboBox.selectSingleOption(destination);
+  await this.comboBox.setSelectedOptions([destination]);
```

Cases **intentionally kept** off the minimal helper (real missing capability, i.e. the bar for a
future extension — not a reason to fatten it now): free-text `onCreateOption` (values that can't
pre-exist — tags, custom field names, date formats); server-side/virtualized search (option not in
the DOM until you type); reading the *available* (unselected) option list. In Kibana these live on a
thin `KbnComboBoxObject` subclass until a capability proves valuable enough to graduate into the
published helper via its own EUI PR.

## Migration workflow (Scout)

1. Inventory every EUI-component usage in the spec and its page objects.
2. Run the decision ladder on each usage.
3. Replace clean cases with the factory (`const cb = page.components.comboBox('subj')`); pass a
   `scope` `Locator`/Component Object for an instance inside a flyout/panel.
4. Leave justified exceptions as-is and note *why* in the PR; track a helper follow-up only if the
   need recurs.
5. Verify: run the test, and confirm it *fails* when the behavior is broken.

## FTR / RTL / Cypress

There's no `page.components` factory for FTR (it isn't Playwright): migrate FTR → Scout first (see
`scout-migrate-from-ftr`) and adopt the helper there, or import the Component Object directly in
RTL/Cypress. The judgment principles above are framework-agnostic and always apply.

## References

- Helper design principles: EUI repo `packages/test-helpers/CONTRIBUTING.md` and `README.md`.
- Reference migration PR: [elastic/kibana#275609](https://github.com/elastic/kibana/pull/275609).
