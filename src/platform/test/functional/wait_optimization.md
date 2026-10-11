# FTR wait optimization patterns

Use this catalog when auditing another FTR config. Each replacement needs a completion signal for the action being tested; elapsed time or absence of a spinner alone does not establish readiness.

## Record and compare

Use the Node version in `.nvmrc` and enable recording without editing the config:

```sh
FTR_RECORD_WAITS=1 TEST_BROWSER_HEADLESS=1 node scripts/functional_tests \
  --config <config-path>
```

Recordings are written under `target/ftr-wait-recordings/<config-path>/<timestamp>-<pid>/`. Start from a successful full-config run, inspect spans around 500 ms or longer, and group their call stacks by helper and action. Keep failed runs as diagnostics rather than baselines. Compare recorded runs with recorded runs, using the same environment.

`waitOrLookupMs` and `sleepAndBackoffMs` use interval unions. Outer retries, WebDriver waits, and nested lookups overlap; adding their durations overcounts elapsed time. Conditional backoff can be necessary while the application works. Timings include browser and transport work and do not measure visual inactivity. Server startup is excluded. See [recorder details](apps/visualize/group1/README.md).

## Catalog

| Pattern | Symptom to inspect | Replacement and reference |
| --- | --- | --- |
| Destination readiness | A 1.5-second probe for a loading indicator that often never appears | Await the destination control, source picker, editor, or completed visualization. See `navigateToNewAggBasedVisualization`, `clickDataTable`, and `openSavedVisualization` in [Visualize](page_objects/visualize_page.ts), and [embedded-mode opening](services/embedding.ts). |
| Optional navigation outcome | Waiting for an unsaved-changes dialog when navigation has already succeeded | Await either the confirmation dialog or the destination, handle the winning outcome, and await completion. See `confirmVisualizeLibraryNavigation` in [Visualize](page_objects/visualize_page.ts). |
| Optional lookup | A missing breadcrumb incurs the default lookup timeout | Probe immediately when absence has an existing navigation fallback. Do not apply this to controls expected to appear asynchronously. See `clickOnVisualizeLibraryBreadcrumb` in [Visualize](page_objects/visualize_page.ts). |
| Known render after mutation | A fixed quiet-period observation after applying options or changing a query | Capture the render count before the action and await a later completed render. See `clickGo` in [the editor](page_objects/visualize_editor_page.ts), `waitForVisualizationRenderComplete` in [the chart](page_objects/visualize_chart_page.ts), and filter tests in [group1](apps/visualize/group1/_data_table.ts). |
| Waiting for the previous query before editing | TSVB waits for a quiet render count before selecting the next aggregation field | Await the field control and selected option. Recheck the selection and completed-render snapshot in the same retry so a lost selection can be restored instead of blocking inside a nested render wait. Capture the count before changing the field and await a later completed render only when the value changed and auto-apply is enabled. Do not require a new query for a no-op selection or manual-apply editing. See `setFieldForAggregation` in [Visual Builder](page_objects/visual_builder_page.ts). |
| Assertion coverage while replacing sleeps | A loop over chart values passes without checking anything when a named-series getter returns an empty array | Read every relevant line series and assert the expected value count before comparing data. See `getAllLineChartData` in [the chart](page_objects/visualize_chart_page.ts) and the [split-series](apps/visualize/replaced_vislib_chart_types_1/_line_chart_split_series.ts) / [split-chart](apps/visualize/replaced_vislib_chart_types_1/_line_chart_split_chart.ts) checks. |
| Debounced editor model | A template, column-label, interval, or drop-last-bucket control appears updated while its model is still pending; waiting for a render can deadlock for empty markdown or when a template references an aggregation not created yet | Await the committed editor model in the URL, then let the later data assertion await its rendered result. See `enterMarkdown`, `setColumnLabelValue`, `setIntervalValue`, `setDropLastBucket`, and `waitForPanelModelValue` in [Visual Builder](page_objects/visual_builder_page.ts). |
| Deletion polling | A modal or popover already gone still costs 500 ms because every deletion poll waits for it to appear | Use immediate element snapshots inside the explicit deletion wait; retain its deadline and restore the implicit timeout on errors. See `waitForDeletedByCssSelector` and [regression tests](../../packages/shared/kbn-ftr-common-functional-ui-services/services/find.test.ts). |
| Zero-timeout child lookup | An explicit zero-timeout optional lookup still waits ten seconds because the wrapper treats zero as an absent argument | Honor zero and restore the original implicit timeout in `finally`, including on lookup errors. Regression coverage is in [WebElementWrapper tests](../../packages/shared/kbn-ftr-common-functional-ui-services/services/web_element_wrapper/web_element_wrapper.test.ts). |
| Expected value instead of quiet time | Each TSVB getter repeats a spinner probe and two-second quiet period before checking a known value or style | Retry fresh reads against the expected value or style. Keep the original assertions and retain the legacy getter contract for callers that do not supply an expected result. See `expectMetricValue`, `expectViewTable`, and the other expected-result methods in [Visual Builder](page_objects/visual_builder_page.ts), and [TSVB metric tests](apps/visualize/group4/_tsvb_metric.ts). |
| Optional panel controls and empty toast cleanup | Hover/layout calculations and context-menu fallbacks wait for absent headers or actions; dismissing zero toasts waits ten seconds | Probe optional fixed headers and in-panel actions immediately, then use the existing context-menu fallback. Dismiss and assert zero toasts with zero-timeout list reads; positive-toast reads keep their readiness waits. See [dashboard panel actions](services/dashboard/panel_actions.ts) and `dismissAll` / `assertCount` in the shared [toasts service](../../packages/shared/kbn-ftr-common-functional-ui-services/services/toasts.ts). |
| Filter count readiness | Counting zero filters spends ten seconds looking for a first filter pill | Retry immediate filter snapshots against the expected count. Preserve the legacy count getter for existing callers. See `expectFilterCount` in [filterBar](services/filter_bar.ts) and the [Vega filter-expression tests](apps/visualize/group6/_vega_chart.ts). |
| Zero-row listing assertions | A search with no matches incurs a ten-second item-link lookup | Keep the outer count assertion retry, but use a zero-timeout lookup when expecting zero rows. Snapshot reads of Content List links also return an empty array immediately. See `expectItemsCount` in [listingTable](services/listing_table.ts) and `findItemLinks` in [contentList](services/content_list.ts). |
| Dashboard save and mode completion | Spinner probes after save success and a fixed probe for a discard dialog when view mode has already appeared | Await save-modal closure and the existing dashboard render-completion signals. After leaving edit mode, race the dialog against the view-mode control. After creating a dashboard, race its confirmation against the editor; open the Save modal without first spending two seconds probing for it. See `saveDashboard` and `clickCancelOutOfEditMode` in [Dashboard](page_objects/dashboard_page.ts). |
| Stale class checks | A dynamic combobox retries the same stale root for two minutes because a class check bypasses recovery | Read classes through the wrapper’s attribute recovery path. See `elementHasClass` and [the stale-root regression](../../packages/shared/kbn-ftr-common-functional-ui-services/services/web_element_wrapper/web_element_wrapper.test.ts). |
| Dynamic combobox options | A requested field is absent briefly and the helper falls back to an unrelated first option | Retry finding the requested option, re-resolving after rerenders. Preserve existing prefix shorthands, but never fall back to an unrelated option. Verify a committed selection rather than treating text in an open dropdown as selected. See `findOption` in [comboBox](services/combo_box.ts). |
| Empty-result lookup | Clearing the TSVB markdown editor takes ten seconds because finding zero syntax tokens waits for the implicit lookup timeout | Clear once, then poll the Monaco model for an empty value. Reading the model avoids a missing-token lookup entirely. See `clearMarkdown` in [Visual Builder](page_objects/visual_builder_page.ts). |
| Local editor state | Spinner probes after switching tabs or stability waits after adding an aggregation, series, color rule, or group-by field | Click once and await the selected tab or increased control count. Query completion belongs at the later data check. See `switchTab`, `createNewAgg`, `createNewAggSeries`, `createColorRule`, and `setAnotherGroupByTermsField` in [Visual Builder](page_objects/visual_builder_page.ts). |
| State change without a required query | A two-second render-stability wait after pinning or resetting | Await the actual state: pinned filter, disabled Apply, selected aggregation, or current completed render. Pinning need not increase the render count. See [pinned-filter tests](apps/visualize/group1/_data_table_nontimeindex.ts) and `clickReset` / `selectAggregation` in [the editor](page_objects/visualize_editor_page.ts). |
| Action readiness | Sleeping before clicking a cell action or Save | Reveal the action with hover and await a visible, enabled control; resolve fresh elements after rerenders. See `filterOnTableCell` in [the chart](page_objects/visualize_chart_page.ts) and `ensureSavePanelOpen` in [Visualize](page_objects/visualize_page.ts). |
| Mutating retry | A retry repeats a filter click while delayed results are arriving | Perform the action once, await its effect, then retry only the assertion. See the time-range test in [embedding](apps/visualize/group1/_embedding_chart.ts) [dashboard filtering](apps/visualize/group1/_data_table_notimeindex_filters.ts), and [group2 metric filtering](apps/visualize/group2/_metric_chart.ts). |
| Data View settings readiness | Repeated 1.5-second spinner appearance probes around field-format editing | Await the Data Views list or empty state after navigation, and the field editor closing after saving. See `clickKibanaIndexPatterns` / `controlChangeSave` in [Settings](page_objects/settings_page.ts). |
| Operation completion | A spinner probe after creating a data view, saving a visualization, or clearing filters | Await the creation/save modal closing, success notification, empty filter pills, or updated URL. See [data-view creation](services/data_views.ts), `saveVisualization` in [Visualize](page_objects/visualize_page.ts), and `removeAllFilters` in [filterBar](services/filter_bar.ts). |
| Action precondition after cleanup | A later test clicks the same row index while it still represents the previous query result | Await the expected unfiltered rows before clicking a value or Other bucket. Cleanup returning and chart completion do not prove the derived table has updated. See the `beforeEach` precondition in [group2 inspector](apps/visualize/group2/_inspector.ts). FAST_3G exposed this stale-input failure even after post-action assertions were retried. |
| Expected result after a query change | A spinner appearance probe before a test already retries a distinct expected result | Await the expected result directly. Counts must differ from the previous state so stale data cannot pass. For unchanged results, also await the operation state, such as the linked-search control disappearing. See [group3 linked saved searches](apps/visualize/group3/_linked_saved_searches.ts) and `clickUnlinkSavedSearch` in [Visualize](page_objects/visualize_page.ts). |
| Derived-view readiness | A chart reports render-complete while the inspector still shows old rows | Await the triggered chart render, then retry only the expected inspector table assertion. Chart completion does not prove that another React view has committed its updated data. See `expectInspectorTableData` and filter tests in [group2 inspector](apps/visualize/group2/_inspector.ts). |
| Redundant delay after completion | A sleep or stability check immediately after a helper that already awaits the triggered render | Inspect the helper's contract and remove the duplicate delay while retaining the data assertions. `clickGo` already awaits an increased completed render count in [the editor](page_objects/visualize_editor_page.ts). Examples: remove the histogram sleep in [group2 histogram](apps/visualize/group2/_histogram_request_start.ts) and post-Apply stability checks in [group2 heatmap](apps/visualize/group2/_heatmap_chart.ts). |
| Staged aggregation state | Global spinner appearance probes after enabling/disabling an aggregation or opening its accordion | Await the changed enabled-state control or accordion expanded state, then let Apply await the triggered render. See `toggleDisabledAgg` / `toggleAggregationEditor` in [the editor](page_objects/visualize_editor_page.ts). |
| Editor model readiness | Fixed sleeps after typing or accepting a Monaco suggestion | Retry the actual Monaco model value, then assert suggestions. See the typeahead test in [Timelion](apps/visualize/replaced_vislib_chart_types_3/_timelion.ts). |
| Already-completed fallback | Animation delay even though a combobox options list is closed | Return immediately if the list is closed; retain the existing closing fallback for an open list. See `closeOptionsList` in [comboBox](services/combo_box.ts). |

## Example: inspector filtering

Check the data used to choose the action before clicking. Afterward, wait for the chart render and the inspector's expected rows separately. Keep the mutation outside assertion retries:

```ts
await retry.try(async () => {
  await inspector.expectTableData(unfilteredRows);
});
const renderingCount = await visChart.getVisualizationRenderingCount();
await inspector.filterForTableCell({ column: 1, row: 3, filter: 'in' });
await visChart.waitForVisualizationRenderComplete(renderingCount + 1);
await retry.try(async () => {
  await inspector.expectTableData(expectedFilteredRows);
});
```

See [the complete group2 tests](apps/visualize/group2/_inspector.ts) for the expected data and cleanup. The precondition matters when an Other bucket's meaning depends on the preceding query result.

## Contracts and validation

- A completed render and a period without further renders are different contracts. Replace stability waits at individual action sites; retain the shared quiet-period helper for callers that require it.
- Render counters are not universal. Dashboard visualization loaders do not expose the editor counter. Use [renderable](services/renderable.ts) and the expected application state for those callers. Resolve the destination before using a generic render signal so an old view cannot satisfy it.
- Visible and enabled does not always mean a click reaches the intended action. The first attempt to replace the table-cell sleep with a cell click missed the action; hover plus fresh action lookup passed the actual filter assertions.
- Preserve intentional navigation resets for spaces, filters, time ranges, and cached UI settings. A destination control being visible does not remove that reset contract. The [heatmap setup](apps/visualize/group2/_heatmap_chart.ts) must reload because its chart-library setting controls plugin registration.
- Preserve test count, assertions, config, and Mocha deadlines. Use existing configured budgets for newly awaited completion conditions. Check both normal execution and delayed browser traffic.
- Chrome's `FAST_3G` profile uses 560 ms latency, 180,000 bytes/s download, and 87,500 bytes/s upload. It throttles browser requests, not Node clients, server processing, or WebDriver transport. Read conditions back to verify activation.
- Distinguish full-config throttling from throttled test bodies with normal suite setup. Local source-build bundle loading exceeded group1's initial setup deadline under full-config FAST_3G. Passing test bodies with normal setup does not establish a full-config slow-network pass.

## Investigations to carry forward

- **Timepicker delays:** audit date entry, Apply/Update clicks, auto-refresh setup, and redundant waits after the time range has committed. Group wait spans by [the shared timepicker](page_objects/time_picker.ts) call stacks, distinguish input/model readiness from query/render completion, and validate any replacements under FAST_3G. Initial targets include the legacy absolute-time reader’s two-second popover delay, repeated date-popover transitions, and the global-loading check after `setAbsoluteRange`. Deletion polling is already being improved in the shared find helper; the remaining timepicker behavior needs its own validation. This is an open investigation, not a measured improvement yet.

- **Remaining TSVB setter probes:** the final group6 normal run still records spinner appearance checks in `setDrilldownUrl`, `fillInVariable`, and `fillInExpression`; group11 retains checks around index-pattern editing. These are future candidates for model/input readiness checks, not proof that the elapsed waits are required.

- **Full-page test resets:** TSVB’s `resetPage` bootstraps Kibana again in beforeEach. Local source-bundle loading under FAST_3G exceeded group4’s existing 120-second hook deadline before any body ran. Investigate same-app navigation that preserves time/filter, settings, and data-view cache reset semantics. Body-only throttling is a separate validation scope and must not be described as throttled setup.

## Measured applications

All 13 Visualize configs completed successfully in normal runs: 356 active tests, with the existing group8 skip retained. Across those runs, recorded waits/lookups totaled 593.2 seconds and fixed sleeps totaled 0.6 seconds (four 150 ms input debounces). Runs span the optimization sequence; affected TSVB configs were repeated after the shared stale-class fix.

| Config | Normal tests passed | Recorded waits/lookups (seconds) | FAST_3G result |
| --- | ---: | ---: | --- |
| `group1` | 41 | 63.5 | Passed (bodies and beforeEach/afterEach; suite setup unthrottled) |
| `group10` | 6 | 21.4 | Passed (body only; setup/cleanup unthrottled) |
| `group11` | 13 | 44.5 | Passed (body only; setup/cleanup unthrottled) |
| `group2` | 35 | 52.5 | Passed (bodies and beforeEach/afterEach; suite setup unthrottled) |
| `group3` | 7 | 9.2 | Passed (bodies and beforeEach/afterEach; suite setup unthrottled) |
| `group4` | 11 | 39.9 | Passed (body only; setup/cleanup unthrottled) |
| `group6` | 55 | 111.9 | Failed; investigation open |
| `group7` | 19 | 62.2 | Failed; investigation open |
| `group8` | 22 | 29.1 | Failed; investigation open |
| `group9` | 8 | 23.2 | Passed (body only; setup/cleanup unthrottled) |
| `replaced_vislib_chart_types_1` | 74 | 65.8 | Failed; investigation open |
| `replaced_vislib_chart_types_2` | 36 | 43.2 | Failed; investigation open |
| `replaced_vislib_chart_types_3` | 29 | 27.1 | Passed (bodies and beforeEach/afterEach; suite setup unthrottled) |

For the 8 remaining configs with successful baselines, recorded waits/lookups fell from 1779.4 to 395.8 seconds. These are individual local runs; some baselines already contain earlier shared-helper improvements. Failed group8 and replacement-charts-2 baselines are excluded from comparisons.

The FAST_3G batch is not a clean pass. The initial group4 run and group6 hit beforeEach deadlines during full-page resets; group4 subsequently passed all 11 bodies with setup and cleanup unthrottled, and group7 exceeded its bulk-delete test deadline. Group8 exposed pie-result and annotation readiness failures; replacement charts 1 failed waiting for an embedded visualization and replacement charts 2 read stale legend results. These remain open validation work. No config or Mocha deadline was increased.

Raw recordings and per-pass reports remain local artifacts under `target/ftr-wait-recordings/`; this catalog retains the transferable patterns and source references.
