# EUI vs kbn-ui — routing decisions

This reference is the decision layer between Step 1 (component identification)
and Step 2 (Kibana chrome placement) of the "Build a prototype from this
design" skill.

Its job is to answer one question per resolved component:
**Use the raw EUI component, or the Kibana-specific wrapper?**

The default is always raw EUI. Use a kbn-ui wrapper only when this file
explicitly says so.

---

## The rule in one sentence

> If the component controls **page structure, navigation chrome, or
> empty/error states at the page level**, use the kbn-ui wrapper.
> For everything else, use raw EUI.

---

## Routing table

| Design element | ❌ Never use in Kibana | ✅ Use instead | Package |
|---|---|---|---|
| Full page layout | `EuiPageTemplate` | `KibanaPageTemplate` | `@kbn/shared-ux-page-kibana-template` |
| Page-level header | `EuiPageHeader` | See **Page header** section below | — |
| No-data / onboarding page | Custom `EuiEmptyPrompt` layouts | `KibanaNoDataPage` | `@kbn/shared-ux-page-kibana-no-data` |
| No-data with config options | Custom empty states | `NoDataConfigPage` | `@kbn/shared-ux-page-no-data-config` |
| Solution-scoped left nav | `EuiSideNav` directly | `SolutionNav` | `@kbn/shared-ux-page-solution-nav` |
| Error boundary | Raw `try/catch` in render | `KibanaErrorBoundary` | `@kbn/shared-ux-error-boundary` |
| Section-level error boundary | — | `KibanaSectionErrorBoundary` | `@kbn/shared-ux-error-boundary` |

Everything not in this table → **raw EUI**. Do not create Kibana-specific
wrappers for buttons, panels, tables, forms, overlays, or display components.

---

## Page header

The correct component depends on what Kibana solution or plugin you are
prototyping for.

> 🔍 **Needs verification** — confirm the correct import path and component
> name with the owning team before the Day 4 test. The pattern varies across
> Kibana solutions. Common options:

- Some solutions use `EuiPageHeader` from `@elastic/eui` directly inside
  a `KibanaPageTemplate` — this is acceptable when no Kibana-specific
  header wrapper exists for that solution.
- Others have a solution-specific header component. Check the existing
  page files in the target plugin before deciding.
- **Never invent a page header wrapper** — use what the solution already uses
  for consistency.

---

## `KibanaPageTemplate` — what it replaces and why

`EuiPageTemplate` works fine in isolation but does not wire up
Kibana-specific concerns: solution navigation, no-data detection, and
the global chrome offset. `KibanaPageTemplate` handles all of this.

```tsx
// ❌ Wrong in Kibana
import { EuiPageTemplate } from '@elastic/eui';

// ✅ Correct
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
```

`KibanaPageTemplate` accepts the same props as `EuiPageTemplate` plus:
- `solutionNav` — plug in a `SolutionNav` component for left-rail navigation
- `noDataConfig` — declarative no-data state without a separate page

---

## `KibanaNoDataPage` — when to use it

Use `KibanaNoDataPage` when the prototype shows an empty state that is
**caused by the absence of data** (no indices, no data views, no saved
objects) rather than by a search returning zero results.

Zero-results empty states inside a populated page → `EuiEmptyPrompt` (raw EUI).
First-time / no-data-source states → `KibanaNoDataPage`.

---

## `SolutionNav` — when to use it

Use `SolutionNav` when the design shows a **persistent left-rail navigation**
that is scoped to a solution (Observability, Security, Enterprise Search, etc.)
rather than global Kibana navigation.

The global Kibana navigation (top bar, left global nav) is **managed by the
Kibana shell** — do not implement it in a prototype. Only implement the
solution-level nav if the design shows one.

---

## Components that are always raw EUI in Kibana

These are explicitly confirmed as raw EUI — do not wrap or replace them:

| Component | Raw EUI import |
|---|---|
| All buttons | `EuiButton`, `EuiButtonEmpty`, `EuiButtonIcon`, `EuiButtonGroup` |
| All overlays | `EuiFlyout`, `EuiModal`, `EuiConfirmModal`, `EuiPopover` |
| All tables | `EuiBasicTable`, `EuiInMemoryTable`, `EuiDataGrid` |
| All forms | `EuiForm`, `EuiFormRow`, `EuiFieldText`, `EuiComboBox`, etc. |
| All display | `EuiCallOut`, `EuiBadge`, `EuiHealth`, `EuiStat`, `EuiPanel`, etc. |
| All navigation sub-components | `EuiTabs`, `EuiBreadcrumbs`, `EuiPagination` |
| Layout primitives | `EuiFlexGroup`, `EuiFlexItem`, `EuiSpacer` |
| In-page empty states | `EuiEmptyPrompt` |
| Typography | `EuiTitle`, `EuiText` |

---

## Decision flowchart

```
Is this component controlling the full page layout?
  └─ Yes → KibanaPageTemplate

Is this a page-level header with title + actions?
  └─ Yes → Check existing solution pattern (see Page header section)

Is this a full-page empty state caused by missing data?
  └─ Yes → KibanaNoDataPage or NoDataConfigPage

Is this a persistent solution-scoped left navigation?
  └─ Yes → SolutionNav

Is this a React error boundary at page or section level?
  └─ Yes → KibanaErrorBoundary / KibanaSectionErrorBoundary

Everything else → raw EUI from @elastic/eui
```
