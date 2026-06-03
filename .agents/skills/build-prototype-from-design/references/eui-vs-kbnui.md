# EUI vs kbn-ui — routing decisions

Decision layer during [process-and-plan](process-and-plan.md) (step 1): for each resolved component, **raw EUI or Kibana wrapper?**

**Default is always raw EUI.** Use a kbn-ui / shared-ux wrapper only when this file says so.

---

## The rule in one sentence

> If the component controls **page structure, navigation chrome, or empty/error states at the page level**, use the Kibana wrapper.  
> For everything else, use raw EUI.

---

## Routing table

| Design element | Never use in Kibana | Use instead | Package |
|---|---|---|---|
| Full page layout | `EuiPageTemplate` | `KibanaPageTemplate` | `@kbn/shared-ux-page-kibana-template` |
| Page-level header | `EuiPageHeader` alone (without checking) | See **Page header** below | — |
| No-data / onboarding page | Custom `EuiEmptyPrompt` layouts | `KibanaNoDataPage` | `@kbn/shared-ux-page-kibana-no-data` |
| No-data with config options | Custom empty states | `NoDataConfigPage` | `@kbn/shared-ux-page-no-data-config` |
| Solution-scoped left nav (classic) | `EuiSideNav` directly | `SolutionNav` | `@kbn/shared-ux-page-solution-nav` |
| Solution left nav (Borealis chrome) | Custom nav from scratch | `Navigation` | `@kbn/ui-side-navigation` — see [side-navigation](../../../../src/platform/kbn-ui/side-navigation/README.md) |
| Error boundary | Raw `try/catch` in render | `KibanaErrorBoundary` | `@kbn/shared-ux-error-boundary` |
| Section-level error boundary | — | `KibanaSectionErrorBoundary` | `@kbn/shared-ux-error-boundary` |

Everything **not** in this table → **raw EUI**. Do not wrap buttons, panels, tables, forms, overlays, or display components.

---

## Page header

Depends on target solution or plugin:

- Some solutions use `EuiPageHeader` inside `KibanaPageTemplate` when no Kibana header wrapper exists — acceptable.
- Others use a solution-specific header — check existing pages in the target plugin first.
- **Never invent a page header wrapper.**

---

## `KibanaPageTemplate`

`EuiPageTemplate` does not wire Kibana concerns (chrome offset, no-data, solution nav). Use:

```tsx
// Wrong in Kibana
import { EuiPageTemplate } from '@elastic/eui';

// Correct
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
```

Extra props: `solutionNav`, `noDataConfig`. Tutorial: [KibanaPageTemplate (dev)](https://docs.elastic.dev/kibana-dev-docs/tutorials/kibana-page-template).

---

## `KibanaNoDataPage`

Use when empty state is **missing data** (no indices, data views, saved objects) — not zero search results.

| Situation | Component |
|-----------|-----------|
| Zero results in a populated page | `EuiEmptyPrompt` (raw EUI) |
| First-time / no data source | `KibanaNoDataPage` |

---

## Solution navigation

| Pattern | Component | When |
|---------|-----------|------|
| **Solution-scoped left rail** (classic) | `SolutionNav` | Persistent solution IA inside app; pairs with `KibanaPageTemplate` |
| **Borealis solution chrome** | `Navigation` (`@kbn/ui-side-navigation`) | Design matches new platform side nav; chrome-owned — see [kbn-ui layout](../../../../src/platform/kbn-ui/README.md) |

**Global Kibana chrome** (top bar, global left nav) is **shell-managed** — do not rebuild in a prototype unless the design is explicitly in-app only.

---

## Always raw EUI

| Category | Examples |
|----------|----------|
| Buttons | `EuiButton`, `EuiButtonEmpty`, `EuiButtonIcon`, `EuiButtonGroup` |
| Overlays | `EuiFlyout`, `EuiModal`, `EuiConfirmModal`, `EuiPopover` |
| Tables | `EuiBasicTable`, `EuiInMemoryTable`, `EuiDataGrid` |
| Forms | `EuiForm`, `EuiFormRow`, `EuiFieldText`, `EuiComboBox`, … |
| Display | `EuiCallOut`, `EuiBadge`, `EuiHealth`, `EuiStat`, `EuiPanel`, … |
| In-page nav | `EuiTabs`, `EuiBreadcrumbs`, `EuiPagination` |
| Layout | `EuiFlexGroup`, `EuiFlexItem`, `EuiSpacer` |
| In-page empty | `EuiEmptyPrompt` |
| Typography | `EuiTitle`, `EuiText` |

---

## Decision flowchart

```
Full page layout?
  └─ Yes → KibanaPageTemplate

Page-level header (title + actions)?
  └─ Yes → Match target solution pattern (see Page header)

Full-page empty from missing data?
  └─ Yes → KibanaNoDataPage or NoDataConfigPage

Persistent solution left nav?
  └─ Yes → SolutionNav OR @kbn/ui-side-navigation (match design era)

Page/section React error boundary?
  └─ Yes → KibanaErrorBoundary / KibanaSectionErrorBoundary

Else → raw EUI (@elastic/eui)
```

---

## Where to search

| Need | Path |
|------|------|
| Shared UX packages | `src/platform/packages/shared/shared-ux/` |
| kbn-ui packages | `src/platform/kbn-ui/` |
| High-level data UI | [Building blocks](https://docs.elastic.dev/kibana-dev-docs/key-concepts/building-blocks) |