---
name: eui-test-helpers-migration
description: >
  Migrate Kibana tests to the published EUI test helpers (`@elastic/eui-test-helpers` — the
  Component Objects like `EuiComboBoxObject`, exposed in Scout via `page.components.<component>(...)`).
  The helpers are intentionally minimal, so migration is a judgment task, not a mechanical rewrite.
  Use when: (1) migrating a Scout/RTL/Cypress test off an in-repo EUI component wrapper onto the
  published helper, (2) a test uses an old wrapper method the minimal helper doesn't expose,
  (3) deciding whether to adapt a test vs. extend a helper vs. move the check to an API/unit test,
  (4) adding or reviewing usage of any `EuiXxxObject` component object, (5) asked "the helper has no
  method for what this test does — now what?".
---

# Migrating tests to the EUI test helpers

## What these helpers are (read first)

`@elastic/eui-test-helpers` ships **Component Objects** — semantic wrappers around a single
Playwright `Locator` (also usable from RTL/Cypress) that encapsulate user-like interactions for one
EUI component. Scout exposes them through a factory on the page, e.g.
`page.components.comboBox(testSubj, scope?)`.

Their purpose is narrow and worth internalizing before you migrate anything:

- **They set up and read component state so the test can focus on its real assertion.** They are
  *not* a way to test EUI's own behavior — EUI has its own RTL/Cypress/VRT suites for that.
- **They are deliberately minimal and configuration-agnostic.** One public method works across every
  prop variant by probing the DOM and dispatching internally. The caller writes
  `await comboBox.clear()`; *how* it clears (pills vs. plain-text vs. dropdown) is an implementation
  detail. Expect roughly 3 powerful methods, not 10 single-purpose ones.

This minimalism is the source of every migration friction below — and it is intentional. Do not
"fix" it by fattening the helper.

## The core principle (every helper, current and future)

**Judge the test — don't blindly mirror the old API.**

In-repo wrappers accrete many narrow methods. The published helper has few, broad ones. The wrong
instinct is a 1:1 method map that stalls the moment an old method has no equivalent and leaves the
case untouched. A method missing from the helper is **not** evidence the method is worth adding — it
is a prompt to re-examine what the test is really doing. For each old-API call, walk this ladder and
stop at the first that applies:

1. **Is the test valid / in e2e scope at all?** Not all tests are good tests. Some assert things that
   don't belong in an end-to-end flow (see next section). If so, fix or drop the test rather than
   preserving a bad assertion through a new helper method.
2. **Can it be expressed with an existing helper method?** Most narrow methods collapse into the
   minimal set (select-one / select-many / read-selection / clear → a couple of set-based methods).
   This unlocks the large majority of cases. Prefer adapting the test to the simpler API.
3. **Does the check belong at a different layer?** Move it to an API/unit test (see below).
4. **Only if none of the above, and the need recurs across multiple tests** → propose extending the
   helper. See "When (and how) to extend a helper." Do this rarely and with a strong reason.

## Not all tests are good tests — the e2e vs. API/unit call

A common anti-pattern: the test calls an API, gets a value, then asserts that value shows up in a
combo box / table / list. **In e2e we trust the lower layers** — verifying data correctness by
reading it back through the DOM is slow, flaky, and redundant. That assertion belongs in an **API or
unit test**, and those results are trusted to be right.

The real exception: when the data is fetched from an API (or held in front-end state) and there is
**non-trivial client-side wiring** — the UI transforms it, cross-links it with other state,
filters/derives what's shown, etc. — then verifying that the wiring produces the right rendered
result *is* legitimate e2e coverage, because only an end-to-end flow exercises that logic. It depends
on the occasion; judge by how much UI logic sits between the data and the pixels.

Decision shortcut for a "does value X appear in the component?" test:

- Pure data correctness ("does the API return X?") → API/unit test; don't port the UI assertion.
- Client-side wiring/derivation of that data into the UI → keep as e2e; express the read with the
  helper's read method (e.g. `getSelectedOptions()`).

## Keep the helper minimal — there is a balance in everything

Design rules the helpers hold themselves to (see the EUI repo's
`packages/test-helpers/CONTRIBUTING.md` and `README.md`):

- **Minimal public API.** Every public method is stable surface Kibana couples to, and a new way to
  couple tests to EUI's internal DOM. Keep methods private until a genuine external need emerges.
- **Configuration-agnostic (auto-detect, don't parameterize).** Prefer one method that probes the
  DOM and dispatches internally over N variant-specific methods.
- **Don't test EUI through the helper.** "Click the clear button to verify `onChange` fires" belongs
  in EUI's own suite, not in a consumer test.
- **Use framework built-ins for simple components.** Reach for a helper only where the component is
  non-trivial to drive reliably.

The balance: too thin and every test re-invents DOM-poking; too fat and the helper becomes an
unstable grab-bag coupled to EUI internals. **Bias toward thin, and make each new method earn its
place.**

## Collections & virtualization (rule for any read/enumerate method)

When a helper reads or filters a *collection* (options, rows, list items), never assume the whole set
is in the DOM. Many EUI components (combo box, data grid, selectable) use **virtual scrolling** that
mounts/unmounts items as you scroll, so a naive "return all items" can silently miss entries.

- Prefer **exact-text lookups** ("is X present / select X") over "list everything." A
  `getOptions`/`optionsList`-style method may *require* an explicit search term precisely because the
  options are too many and virtualization has removed the target from the DOM until you filter to it.
- If a test genuinely needs the full list, treat that as a signal to reconsider (is it really e2e? is
  the set bounded?) before adding an enumeration method — and if one is added, document the
  virtualization caveat on it.

## When (and how) to extend a helper

Some cases legitimately need capability the minimal helper doesn't have (e.g. free-text creation via
`onCreateOption` for values that can't pre-exist; server-side/virtualized search where the option
isn't in the DOM until you type; reading the *available* option list). Rules:

- **Extend only when the need is reasonable and valuable across multiple Kibana tests**, not to
  unblock a single test. One caller → keep it local (a Kibana-side subclass) or adapt the test.
- **Prefer extending an existing method** (teach it a new auto-detected configuration) over adding a
  new public method.
- **Land helper additions as their own justified PR** to EUI — don't grow the helper inside a
  migration PR; that stalls the migration behind another review cycle.
- Until the helper gains the capability, it's fine to **leave those specific cases on the old
  wrapper / a Kibana subclass** and migrate the cleanly-mappable cases now. Migrate what maps; defer
  what doesn't with a note.

## Migration workflow (Scout)

1. **Inventory** every EUI-component usage in the spec and its page objects.
2. **Run the decision ladder** above on each usage.
3. **Replace clean cases** with the factory. Pass a `scope` (`Locator` or Component Object) for an
   instance inside a flyout/panel:
   ```ts
   const comboBox = page.components.comboBox('myTestSubj');
   await comboBox.setSelectedOptions(['Logs']);
   expect(await comboBox.getSelectedOptions()).toEqual(['Logs']);
   ```
4. **Leave justified exceptions as-is**, and note *why* in the PR. Track a helper follow-up only if
   the need recurs.
5. **Verify**: run the Scout test, and confirm it *fails* when the behavior is broken (don't trust a
   green test you never saw go red).

## FTR / RTL / Cypress

The package targets Playwright (Scout), RTL, and Cypress. There is no `page.components` factory for
FTR — FTR isn't Playwright — so "migrating an FTR test to the helper" usually means first migrating
FTR → Scout (see the `scout-migrate-from-ftr` skill) and adopting the helper there, or, for RTL/
Cypress, importing the Component Object directly. **The judgment principles above are
framework-agnostic** and apply regardless: don't 1:1-map, don't assert data-correctness through the
UI, keep the helper minimal.

## References

Open only what you need:

- Worked combo-box example — old wrapper (many methods) → minimal helper (three), the full method
  mapping, and the cases intentionally *kept* off the helper with reasons:
  `references/example-combo-box-migration.md`
- Helper design principles: EUI repo `packages/test-helpers/CONTRIBUTING.md` and `README.md`.
- First consumer / reference migration PR: [elastic/kibana#275609](https://github.com/elastic/kibana/pull/275609).

## Skill improvement

After a migration, if you hit a new component-interaction pattern, a recurring justified reason to
extend a helper, or a new "this belongs at a lower layer" case, prompt the user to fold it into this
skill so future migrations benefit.
