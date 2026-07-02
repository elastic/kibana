# Worked example: `EuiComboBox`

Concrete illustration of the principles in `SKILL.md`. The combo box is the first EUI component to
get a published helper, so it's the clearest case of "many-method wrapper → minimal helper." Every
other component object follows the same shape.

## The two APIs

**Old in-repo wrapper** — `EuiComboBoxWrapper`
(`src/platform/packages/shared/kbn-scout/src/playwright/eui_components/combo_box.ts`), ~10 methods,
many overlapping and several parameterized per prop-variant:

`getSelectedMultiOptions`, `getSelectedValue`, `selectMultiOption`, `selectMultiOptions`,
`selectSingleOption`, `setCustomMultiOption`, `setCustomSingleOption`, `removeOption`, `clear`.

**Published helper** — `EuiComboBoxObject` from `@elastic/eui-test-helpers`, three
configuration-agnostic methods that auto-detect pill vs. plain-text vs. dropdown modes:

| Method | Description |
|---|---|
| `setSelectedOptions(labels)` | Replace the selection (set-semantics: adds missing, removes extras, no-op if already matching). Throws if a label never appears in the dropdown. |
| `getSelectedOptions()` | Current selection as `string[]`. |
| `clear()` | Clear all selected options. No-op if empty. |

Scout wires it up as a factory: `page.components.comboBox(testSubj, scope?)`.

## Method mapping (the ladder, applied)

| Old wrapper call | New | Notes |
|---|---|---|
| `selectSingleOption(v)` | `setSelectedOptions([v])` | Clean map. |
| `selectMultiOption(v)` / `selectMultiOptions(vs)` | `setSelectedOptions(vs)` | Set-semantics replaces the "already selected?" guard the old methods threw on. |
| `getSelectedValue()` / `getSelectedMultiOptions()` | `getSelectedOptions()` | One reader for single and multi; plain-text single-select reads the input value. |
| raw `comboBoxClearButton` click | `clear()` | Auto-detects the clearing strategy. |
| `removeOption(v)` (remove one pill) | `setSelectedOptions(current.filter(x => x !== v))` | Express as the desired end-state, not the imperative step. |
| `setCustomSingleOption(v)` / `setCustomMultiOption(v)` (free-text `onCreateOption`) | **no equivalent** | Genuinely missing capability — see "Kept" below. Don't force a bad map. |

## Before / after (real, from PR #275609)

`dashboard_links.ts` page object:

```diff
-import { EuiComboBoxWrapper } from '../eui_components';
+import type { EuiComboBoxObject } from '@elastic/eui-test-helpers';
 ...
-  private readonly dashboardLinkComboBox: EuiComboBoxWrapper;
+  private readonly dashboardLinkComboBox: EuiComboBoxObject;
 ...
-    this.dashboardLinkComboBox = new EuiComboBoxWrapper(this.page, 'links--linkEditor--dashboardLink--comboBox');
+    this.dashboardLinkComboBox = this.page.components.comboBox('links--linkEditor--dashboardLink--comboBox');
 ...
-    await this.dashboardLinkComboBox.selectSingleOption(destination);
+    await this.dashboardLinkComboBox.setSelectedOptions([destination]);
```

Nothing about *what the test verifies* changed — only the setup got simpler and framework-owned.

## Cases intentionally KEPT off the minimal helper (and why)

From the per-site triage in PR #275609. Each has a real reason `setSelectedOptions` can't cover it —
this is the "strong reason" bar for eventually extending the helper, not a reason to fatten it now:

- **Free-text `onCreateOption`** — values that can't pre-exist as selectable options (rule tags, APM
  custom env, agent-builder labels, streams condition fields/values, date-format strings).
  `setSelectedOptions` can only pick options that appear in the dropdown.
- **Server-side / virtualized search** — the option isn't in the DOM until you type a query
  (APM custom links / service map, triggers-actions Tines webhook). You must type-then-pick, and (per
  the virtualization rule in `SKILL.md`) an enumeration/search method here needs an exact term.
- **Reading the *available* (unselected) option list** — asserting on the options themselves, not the
  selection.
- **Mixed files** — a single file with both clean and free-text combos was kept whole to avoid two
  combo helpers in one file until the helper covers both.

In Kibana these currently live on a thin subclass (`KbnComboBoxObject`) that adds `createOptions`,
`searchAndSelect`, and `getAvailableOptions` — deliberately Kibana-side until a capability proves
valuable enough across tests to graduate into the published helper via its own EUI PR. That
graduation is tracked separately; a migration PR should not carry it.

## The takeaway

Roughly the whole "pick an existing option / read it / clear it" population maps cleanly onto three
methods. The friction cases are a small, well-understood minority with genuine missing capability —
and the right response to them is triage (adapt the test, move it to a lower layer, or defer with a
note), **not** a reflexive new helper method.
