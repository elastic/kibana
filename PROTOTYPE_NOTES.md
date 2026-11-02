# Prototype: Inspector snapshots with Discover replay

Goal: export the Inspector's requests and Discover's state on machine A as one file, then import
it on machine B and get the same Discover tab back. The table and the histogram show the recorded
data, even if that data doesn't exist on B.

Status: prototype on `inspector-snapshot-replay-prototype`, based on upstream `elastic/kibana`
`main` (5cf340c0576). It has no feature flag, no i18n and no Scout test. It was checked with Jest,
type_check and code reading only. **It has not been run in a browser against two clusters.**

## What was built

### Inspector (Phase 1)
- `public/snapshot/snapshot.ts`
  - Snapshot format: `{ version: 1, meta, requests: { [adapterName]: Request[] }, app?: { id, state } }`.
  - `serializeAdapters` exports every `RequestAdapter` by name. An adapter with
    `getRequestsBySource()` (Discover's `AggregateRequestAdapter`) is split back into
    `requests` / `lensRequests` / `cascadedDocuments`.
  - `deserializeSnapshot` checks a 50 MB size cap and the version, then validates with `@kbn/zod`
    (v4, `looseObject`).
  - `createRequestAdapter(s)` rebuilds adapters through
    `start(name, params, startTime).json().stats().ok()/error()`.
  - JSON by default. Optional gzip uses the native `CompressionStream`/`DecompressionStream` (no
    new dependency); gzip is detected on import by its magic bytes. Downloads use `file-saver`.
- `public/snapshot/snapshot_controls.tsx`, `ui/inspector_panel.tsx`
  - Export / Import buttons next to the view chooser.
  - Export opens a popover that warns about sensitive data and has a gzip switch.
  - Import shows the snapshot read-only in the Requests view, with a callout
    "Snapshot from …, Kibana x". The callout has "Restore in app" (only when `app.id` matches
    `InspectorOptions.snapshot.appId`) and "Back to live requests".
- `InspectorOptions.snapshot = { appId, getAppState, restore? }` (`public/types.ts`).
- `RequestParams.replayKey` plus a `RequestResponder.replayKey()` setter, needed because
  `SearchSource` only knows the final params after `adapter.start()`.

### Data plugin
- `common/search/create_replay_key.ts`: `createReplayKey(params)` is a SHA-256 of the
  stable-stringified params without `preference` and `sessionId`, the same approach as
  `create_request_hash.ts`. It lives in `common/`, not next to `create_request_hash.ts`, because
  `search_source.ts` and `search_methods.ts` are common code and can't import from `public/`.
  `getReplayKind()` returns `esql` / `aggs` / `hits`.
- The `replayKey` is recorded in `SearchSource.fetch$` (from the exact `params` passed to
  `search()`) and in `SearchMethodsService.esql/dsl`.
- `public/search/replay/replay_registry.ts` (~100 lines):
  - `activate(requests, { passthrough }) => dispose`, `isActive()`, `isActive$`, `match()`.
  - Matching order:
    1. exact `replayKey`
    2. same ES|QL query text (added, see Risk 2)
    3. same kind, in order of arrival.
  - Each entry is used only once.
  - A miss throws a `NotInSnapshotError`, or goes live when `passthrough: true`.
- Hooked into `SearchInterceptor.search()` before `createRequestHash$`, and exposed as
  `data.search.replay`.

### Discover (Phase 2 + replay)
- `state_management/utils/inspector_snapshot.ts`
  - `getDiscoverSnapshotAppState` reuses `createUrlGeneratorState` (now exported) with
    `shouldRestoreSearchSession: true` (absolute time).
  - It drops `searchSessionId` and always includes the full `dataView.toSpec()`.
  - It adds `uiState.{dataGrid, layout, fieldListExistingFieldsInfo}` and `attributes.visContext`.
- `redux/actions/tabs.ts`
  - New `openLocatorParamsInNewTab({ params, label, uiState, visContext, replay })`.
    `openSearchSessionInNewTab` now delegates to it.
  - The replay is activated before the tab is created, so the first fetch is served from the
    snapshot.
  - The dispose function is stored in the tab runtime state (`replay$`) and called in
    `disconnectTab`, which runs on tab close and on app unmount.
  - `openInNewTab` now also accepts `uiState` and `visContext`.
- `use_inspector.ts` passes `snapshot: { appId: 'discover', getAppState, restore }`, and names the
  aggregated adapters.
- `resolve_data_view.ts` and `tab_state_data_view.ts` call `dataViews.create(spec, skipFetchFields)`
  with `skipFetchFields = data.search.replay.isActive()`.
- `components/snapshot_replay_callout`: a callout at the top of the layout with the snapshot date,
  Kibana version, time zone and a "Go live" button. "Go live" disposes the replay and refetches.

## Risk findings

### 1. Does the Lens ad hoc data view fetch fields? Probably not.
Found by reading the code:
- The histogram gets `dataView.toSpec()` (`kbn-unified-histogram/services/lens_vis_service.ts`).
- Lens creates ad hoc data views with `dataViews.create(spec)` (`lens/public/data_views_service/loader.ts`).
- `DataViewsService.create` first checks `dataViewCache` by id. It only refreshes fields when the
  cached view has `fields.length === 0`.

Discover has already created the same id from the full snapshot spec with `skipFetchFields: true`,
so the cached view has fields and Lens shouldn't call field_caps. **Not verified in a browser.**
If it still fetches, skip the fetch while `replay.isActive()`.

### 2. Does the ES|QL histogram send more than one request? One per layer, but there was a real ordering risk.
- The `esql` expression calls `searchService.esql()` once, and the breakdown is a `BY` clause in
  the same query, so the histogram is one request (it was not checked whether the profile/vis
  context adds layers).
- However, the Discover ES|QL table and the Lens ES|QL histogram are both kind `esql`. If the exact
  key misses (for example a different `time_zone` param on B), plain order-of-arrival fallback can
  swap the table and histogram responses when B fires them in a different order than A.
- **Fix in the prototype:** a middle tier that matches on the ES|QL query text (Jest-covered).
  If `histogram:maxBars` differs, the bucket interval in the histogram query changes and
  matching falls back to arrival order again.
- DSL has the same problem in theory. Documents (`hits`) and histogram (`aggs`) are told apart by
  kind, but two `aggs` requests (histogram + cascade/grouped docs) rely on order.

### 3. ES|QL mode on B still calls the cluster outside the interceptor
`resolveEsqlSource` → `EsqlSource.create` → `getESQLSourceInfo` does an `http.post` to the source
info route (the LIMIT 0 schema). That isn't a search, so the replay can't serve it. If the index
doesn't exist on B, ES|QL tab init may fail before any replayed data shows up. Data view mode
doesn't have this problem.
Possible fix: store the `EsqlSource` schema (time field, result columns) in the snapshot and pass
`timeFieldName` / `resultColumns`, which `EsqlSource.create` already accepts to skip LIMIT 0.

### 4. Field existence
`load_field_existing` uses `data.search.search` without an inspector adapter, so it is not
recorded but *is* intercepted. With `fieldListExistingFieldsInfo` restored and a matching
`dataViewHash`, `useExistingFieldsFetcher` skips the request. If the hash doesn't match (for
example a different field order in the spec), the request goes through the replay as kind `hits`.
It could then consume the documents entry, or fail with "Not in snapshot". The data view hash
match was not verified end to end.

### 5. The replay is global, not per tab
`data.search.replay` is global to the interceptor. While a replay is active, searches from other
apps or tabs, Discover's background requests, and other embeddables can be matched or rejected.
A per-tab scope (e.g. tag requests with the tab's `executionContext` or sessionId) would be
needed beyond the prototype. The replay ends on "Go live", tab close, or app unmount.

### 6. Other gaps found
- `esqlControls` in the locator state are not carried into `openInNewTab` (same as the existing
  search-session restore).
- A persisted data view spec includes `version`, so on B the ad hoc copy looks persisted. Saving or
  editing it there would fail. The prototype doesn't handle this.
- Responses replayed through `SearchSource` are the final `IKibanaSearchResponse` after
  `postFlightTransform`/`onResponse`, and replay runs them through those steps again. That's fine
  for the date histogram and hits. Aggs with "other bucket" post-flight requests send an extra
  (unrecorded) request, which fails without passthrough.
- The default import path uses `passthrough: false`, and there is no UI to turn passthrough on.
  "Go live" is the only way out.

## Test and type-check results
- `node scripts/jest src/platform/plugins/shared/data/public/search/replay/replay_registry.test.ts`
  — 7 passed (exact hit, ES|QL query-text tier, kind fallback in order, each entry once, miss
  without passthrough → `NotInSnapshotError`, miss with passthrough → live, dispose).
- `node scripts/jest src/platform/plugins/shared/inspector/public/snapshot/snapshot.test.ts`
  — 4 passed (round trip with `lensRequests` and app state, `getRequestsBySource`, version / schema
  / size rejection, gzip + JSON decode). It runs in the node jest environment with Node's
  `Blob`/`CompressionStream`, because jsdom has neither `Blob.stream()` nor `CompressionStream`.
- `node scripts/jest src/platform/plugins/shared/discover/public/application/main/state_management/utils/inspector_snapshot.test.ts`
  — 1 passed: getAppState → restore yields the same app state, absolute time range, grid UI state
  and vis context in a new tab, activates the replay and stores it in the tab runtime state. The
  only normalization: `createUrlGeneratorState` turns `hideChart/hideTable/hideSidebar: undefined`
  into `false`.
- Regression runs:
  - data `search_source`, `search_methods`, `search_interceptor`, `search_service`: all pass, after
    updating two `search_methods.test.ts` expectations for the new `replayKey` start param.
  - inspector: all 68 tests pass.
  - discover `tabs`, `use_inspector`, `aggregate_request_adapter`, `resolve_data_view`,
    `discover_layout`: 27 pass.
- `node scripts/type_check` for `inspector`, `data` and `discover`: see the commit message / final
  summary for the exact result.
- ESLint: no errors. Warnings remain for `EuiCallOut` content props and `KbnCallout` preferences;
  they were left as is for the prototype.
