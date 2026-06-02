# Plan: Remove `headerContent` prop — let `MlDataSourcePicker` live in the inner plugin pages

## Context

PR #266672 (branch `ml-data-view-selector-heading`, worktree at
`.claude/worktrees/ml-data-view-selector-heading-1`) replaced the intermediate "Select Data View"
page with an inline `MlDataSourcePicker`. The picker is constructed at the **ML plugin** page level
(`useMlKibana().services`) and threaded as a `headerContent?: ReactNode` prop down 2–4 component
layers into the inner `aiops` / `data_visualizer` page headers, where it renders next to the time
controls.

This prop-drilling exists only because the picker is built in the ML layer. The exploration
confirmed there is **no package-visibility barrier**: both `aiops` (shared, platform) and
`data_visualizer` (private, platform) already depend on `@kbn/aiops-components` and can import
`DataViewPicker` (`@kbn/unified-search-plugin/public`) and `SavedObjectFinder`
(`@kbn/saved-objects-finder-plugin/public`). The picker only needs a handful of services and the
current data view — all obtainable from each plugin's own context. The picker drives selection
purely by writing `?index=` / `?savedSearchId=` to the router URL (`useHistory`/`useLocation`), which
the ML `DataSourceContextProvider` (still mounted above) re-reads — so the URL round-trip keeps
working regardless of where the picker is rendered.

**Goal:** remove the `headerContent` prop entirely from the `aiops` and `data_visualizer` plugins;
the inner page components instantiate the picker themselves from their own context.

### Key structural constraint (drives the design)

The picker renders in **two** contexts, and only one moves:

1. **"No data view selected" empty state** — handled at the **ML page level**. The inner plugin
   component is not mounted here (the aiops `*AppState` returns `null` when `!dataView`; the ML
   `index_data_visualizer` / `data_drift` pages short-circuit before mounting the inner component).
   The ML page already builds the picker **inline** (not via the prop) for this branch, so it
   **stays as-is** — it does not involve `headerContent`.
2. **"Data view present" header** — currently receives the picker via `headerContent`. **This is what
   moves**: the inner plugin page header builds the picker itself.

So after this change `MlDataSourcePicker` is still imported by the ML pages (empty state only) **and**
newly built inside each plugin via a small plugin-local wrapper. The `headerContent` prop and all its
pass-throughs are deleted.

## Approach

Add one thin wrapper component per plugin that reads the plugin's context + current data view and
renders `MlDataSourcePicker` with the directly-imported `DataViewPicker` / `SavedObjectFinder`. The
wrapper centralizes the service assembly and falls back to the static data-view title when the
required services are absent (e.g. non-ML/embeddable contexts that never actually mount it), keeping
types sound by narrowing without any change to `@kbn/aiops-components`.

`MlDataSourcePicker` itself (in `@kbn/aiops-components`) is **unchanged** — it keeps its injected
`DataViewPickerComponent` / `SavedObjectFinderComponent` props and `services` shape.

---

## Changes

### A. AIOps plugin (flows: Log Rate Analysis, Log Pattern Analysis, Change Point Detection)

**A1. New wrapper** `x-pack/platform/plugins/shared/aiops/public/components/data_source_picker/data_source_picker.tsx`
(+ `index.ts`):

```tsx
export const AiopsDataSourcePicker: FC<{ currentDataView: DataView | null }> = ({ currentDataView }) => {
  const { data, dataViewEditor, dataViewFieldEditor, contentManagement, http, application, uiSettings } =
    useAiopsAppContext();
  if (!dataViewFieldEditor || !contentManagement) {
    return currentDataView ? (
      <EuiTitle size="l"><h2>{currentDataView.getName()}</h2></EuiTitle>
    ) : null; // preserves the previous static-title fallback
  }
  return (
    <MlDataSourcePicker
      currentDataView={currentDataView}
      services={{ dataViews: data.dataViews, dataViewEditor, dataViewFieldEditor, contentManagement, http, application, uiSettings }}
      DataViewPickerComponent={DataViewPicker}
      SavedObjectFinderComponent={SavedObjectFinder}
    />
  );
};
```
Takes `currentDataView` as a prop (not from `useDataSource()`) so it also works in the
`timeSeriesDataViewWarning` branches, which mount `AiopsAppContext` but **not** `DataSourceContext`.

**A2. Extend `AiopsAppContextValue`** in `public/hooks/use_aiops_app_context.ts` — add three
**optional** fields (matching the existing `embeddable?` / `cases?` pattern, so embeddable/
shared-component construction sites are unaffected):
- `dataViewEditor?: DataViewEditorStart` (`@kbn/data-view-editor-plugin/public`)
- `dataViewFieldEditor?: IndexPatternFieldEditorStart` (`@kbn/data-view-field-editor-plugin/public`)
- `contentManagement?: ContentManagementPublicStart` (`@kbn/content-management-plugin/public`)

**A3. Populate them** in the three ML AIOps page files (where `appContextValue` is built via
`pick(services, [...])`): add `'dataViewEditor'`, `'dataViewFieldEditor'`, `'contentManagement'` to
each pick list. Files:
- `x-pack/platform/plugins/shared/ml/public/application/aiops/log_rate_analysis.tsx`
- `.../aiops/log_categorization.tsx`
- `.../aiops/change_point_detection.tsx`

(These ML `services` already expose those keys — the existing inline empty-state picker relies on
them. Verify during implementation.)

**A4. Render the wrapper / delete the prop** in the aiops components:
- `public/components/page_header/page_header.tsx` — drop `headerContent` from `PageHeaderProps` and
  the `headerContent !== undefined ? … : <static title>` block; render
  `<AiopsDataSourcePicker currentDataView={dataView} />` (dataView from `useDataSource()`). Keep
  `rightSideItems`.
- `log_rate_analysis/log_rate_analysis_app_state.tsx` & `log_rate_analysis_page.tsx` — remove
  `headerContent` from props/interfaces and the `<LogRateAnalysisPage headerContent=…>` /
  `<PageHeader headerContent=…>` pass-throughs; in the warning branch replace `{headerContent}` with
  `<AiopsDataSourcePicker currentDataView={dataView} />`.
- `log_categorization/log_categorization_app_state.tsx` & `log_categorization_page.tsx` — same.
- `change_point_detection/change_point_detection_root.tsx` — remove `headerContent` from props and
  the `<PageHeader headerContent=…>` call (keep `rightSideItems`); warning branch uses the wrapper.

**A5. Manifest** — add `dataViewEditor` and `contentManagement` to `requiredPlugins` (or
`optionalPlugins`) in `x-pack/platform/plugins/shared/aiops/kibana.jsonc` if not already pulled in.
`unifiedSearch` is already present; add `savedObjectsFinder` since `SavedObjectFinder` is now imported
directly. (`dataViewFieldEditor` availability: confirm; add if missing.)

### B. Data Visualizer plugin (flows: Index Data Visualizer, Data Drift)

**B1. New wrapper** `x-pack/platform/plugins/private/data_visualizer/public/application/common/components/data_source_picker/data_source_picker.tsx`:

```tsx
export const DataVisualizerDataSourcePicker: FC<{
  currentDataView: DataView | null;
  onFieldSaved?: () => void;
}> = ({ currentDataView, onFieldSaved }) => {
  const { services } = useDataVisualizerKibana();
  const { data, dataViewEditor, dataViewFieldEditor, contentManagement, http, application, uiSettings } = services;
  if (!dataViewFieldEditor || !contentManagement) {
    return currentDataView ? <EuiTitle size="s"><h2 data-test-subj="mlDataDriftPageDataViewTitle">{currentDataView.getName()}</h2></EuiTitle> : null;
  }
  return (
    <MlDataSourcePicker
      currentDataView={currentDataView}
      services={{ dataViews: data.dataViews, dataViewEditor, dataViewFieldEditor, contentManagement, http, application, uiSettings }}
      DataViewPickerComponent={DataViewPicker}
      SavedObjectFinderComponent={SavedObjectFinder}
      onFieldSaved={onFieldSaved}
    />
  );
};
```

**B2. Extend start dependencies** in
`public/application/common/types/data_visualizer_plugin.ts` (`DataVisualizerStartDependencies`):
add `dataViewEditor?: DataViewEditorStart` and `contentManagement?: ContentManagementPublicStart`
(`dataViewFieldEditor?` and `data` already exist). Wire them in the plugin `start` where
`StartServices` is assembled (`public/plugin.ts` / `kibana_services.ts` `getPluginsStart()` and the
`services` object built in `index_data_visualizer.tsx` lines ~317-342 — add `dataViewEditor` and
`contentManagement` to that bag).

**B3. Render the wrapper / delete the prop**:
- `index_data_visualizer/components/index_data_visualizer_view/index_data_visualizer_view.tsx` —
  drop `headerContent` from props; replace `{headerContent ?? null}` (the header `EuiFlexItem`) with
  `<DataVisualizerDataSourcePicker currentDataView={currentDataView} onFieldSaved={() => mlTimefilterRefresh$.next({ lastRefresh: Date.now() })} />`.
- `index_data_visualizer/index_data_visualizer.tsx` — remove `headerContent` from
  `DataVisualizerStateContextProviderProps`, the inner `Props`, both destructures, the
  `<IndexDataVisualizerComponent headerContent=…>` and `<DataVisualizerStateContextProvider headerContent=…>`
  pass-throughs; the `headerContent ?? null` empty branch (line ~298) becomes
  `<DataVisualizerDataSourcePicker currentDataView={currentDataView ?? null} />`.
- `data_drift/data_drift_page.tsx` — drop `headerContent` from the local `PageHeaderProps` and
  `DataDriftPage` `Props`; replace `{headerContent ?? <static title>}` with
  `<DataVisualizerDataSourcePicker currentDataView={dataView} />` (dataView from `useDataSource()`).
- `data_drift/data_drift_app_state.tsx` — remove `headerContent` from props and the
  `<DataDriftPage headerContent=…>` pass-through.

**B4. Manifest** — add `dataViewEditor`, `contentManagement`, and `savedObjectsFinder` to
`requiredPlugins`/`optionalPlugins` in
`x-pack/platform/plugins/private/data_visualizer/kibana.jsonc` as needed (`unifiedSearch` already
present).

### C. ML plugin (producers — minimal change)

In each of the four ML page files, **stop passing** `headerContent={…}` to the inner component;
**keep** the inline `MlDataSourcePicker` construction that feeds the "no data view" empty-state branch
(it is unchanged and does not use the prop). Files:
- `public/application/aiops/log_rate_analysis.tsx`, `.../log_categorization.tsx`,
  `.../change_point_detection.tsx`
- `public/application/datavisualizer/index_based/index_data_visualizer.tsx`
- `public/application/datavisualizer/data_drift/data_drift_page.tsx`

(For AIOps, the local `headerContent` variable now feeds only the empty-state branch — rename to
`dataSourcePicker` for clarity, matching the data-visualizer pages.)

### D. tsconfig / moon.yml

Add any newly-referenced packages (`@kbn/data-view-editor-plugin`, `@kbn/content-management-plugin`,
`@kbn/saved-objects-finder-plugin`, `@kbn/data-view-field-editor-plugin`) to the `tsconfig.json`
`kbn_references` and `moon.yml` of `aiops` and `data_visualizer` where not already present.

---

## Tests

- Update `aiops` / `data_visualizer` unit tests that pass or assert on `headerContent`.
- Add/extend a unit test for each wrapper (`AiopsDataSourcePicker`, `DataVisualizerDataSourcePicker`):
  renders the picker when services present; renders the static title fallback when
  `dataViewFieldEditor`/`contentManagement` are missing.
- The existing `MlDataSourcePicker` unit test (`@kbn/aiops-components`) is unaffected (component
  unchanged).
- FTR services target `data-test-subj`s on the picker (`mlDataSourceSelectorButton`,
  `mlOpenDiscoverSessionButton`, `mlDataDriftPageDataViewTitle`) — these are preserved, so the
  data_visualizer / data_drift / AIOps FTR suites should not need changes. Re-run to confirm.

## Verification

1. Type-check each touched project separately (CLAUDE.md rule — single `--project`, `--cleanup`):
   - `node scripts/type_check --project x-pack/platform/plugins/shared/aiops/tsconfig.json --cleanup`
   - `node scripts/type_check --project x-pack/platform/plugins/private/data_visualizer/tsconfig.json --cleanup`
   - `node scripts/type_check --project x-pack/platform/plugins/shared/ml/tsconfig.json --cleanup`
2. Lint changed files: `node scripts/eslint --fix $(git diff --name-only)` — in particular verify no
   `@kbn/imports/no_group_crossing_imports` violation from the new direct imports.
3. Jest: run the affected aiops + data_visualizer suites.
4. Manual (start Kibana, log in `elastic/qaf_admin`):
   - Log Rate Analysis, Log Pattern Analysis, Change Point Detection: page loads with the inline
     picker beside the time controls; switching the data view (writes `?index=`) re-runs the
     analysis; "Open Discover session" flyout opens and selecting a session navigates.
   - Index Data Visualizer (data view) and Data Drift: picker renders in-header; switching updates the
     view(s).
   - Empty state (navigate with no `?index=`): the ML-level picker + "No data view selected" prompt
     still render and selecting a data view loads the page.
   - Confirm the `bootstrap` step (`yarn kbn bootstrap`) was run after editing any `kibana.jsonc`.

## Out of scope / notes

- `@kbn/aiops-components`'s `MlDataSourcePicker` is intentionally left unchanged (keeps DI props).
- The ML-level empty-state picker is intentionally retained; fully centralizing it into the plugins
  would require making the aiops `DataSourceContext` accept a null data view and always-mounting the
  inner components — a larger change not requested here.
