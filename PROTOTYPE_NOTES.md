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
  - "Import / Export" is an entry in the **View** menu (next to Requests, Profiles, …). It is
    only listed when the Inspector has a `requests` adapter.
  - The Export section warns about sensitive data, has a gzip switch and a "Download snapshot"
    button. Export errors are shown in a callout.
  - Import shows the snapshot read-only in the Requests view (the Requests view is selected), with
    a callout "Snapshot from …, Kibana x". The callout has "Restore in app" (only when `app.id`
    matches `InspectorOptions.snapshot.appId`) and "Back to live requests". Selecting another view
    leaves the imported snapshot. Only the latest of overlapping imports is shown.
  - While the app replays a snapshot (`InspectorOptions.snapshot.replay`), live views show a
    "Restored data" callout, and an export records `meta.restoredFrom`.
- `public/snapshot/environment.ts`
  - `meta` also records the Kibana build (version, build number, sha, branch, date, flavor),
    origin, space, time zone, Kibana locale and browser info (name/version and OS parsed from the
    user agent, languages, screen, window, pixel ratio).
  - The fields are optional and validated leniently: invalid values are dropped instead of
    rejecting the snapshot.
  - The import callout shows them in an "Environment details" accordion and badges values that
    differ from the current session.
- `InspectorOptions.snapshot = { appId, getAppState, restore?, replay? }` (`public/types.ts`).
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
- `public/search/replay/replay_registry.ts` (~130 lines):
  - `activate(requests, { passthrough }) => { addSessionId, dispose }`, `isActive()`, `isActive$`,
    `match(request, sessionId)`.
  - Several activations can be active at once. A search is only replayed when its search session
    id was added to an activation; all other searches go live.
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
  - The replay session is passed through `openInNewTab` → `updateTabs` → `setTabs` into the new
    tab's runtime state (`replay$`) when it is created, so it is there before the first fetch.
  - Each fetch of that tab adds its search session id to the replay session
    (`discover_data_state_container.ts`), so only the tab's documents, histogram and hit count
    requests are replayed.
  - The replay session is disposed in `disconnectTab`, which runs on tab close and on app unmount.
  - `openInNewTab` now also accepts `uiState`, `visContext` and `replay`.
- `use_inspector.ts` passes `snapshot: { appId: 'discover', getAppState, restore, replay }`, and
  names the aggregated adapters.
- `resolve_data_view.ts` and `tab_state_data_view.ts` call `dataViews.create(spec, skipFetchFields)`
  with `skipFetchFields` set only when the tab itself replays a snapshot.
- `components/snapshot_replay_callout`: a callout above the query editor with the snapshot date,
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
recorded. It is only intercepted when it runs with the replaying tab's search session id. With `fieldListExistingFieldsInfo` restored and a matching
`dataViewHash`, `useExistingFieldsFetcher` skips the request. If the hash doesn't match (for
example a different field order in the spec), the request goes through the replay as kind `hits`.
It could then consume the documents entry, or fail with "Not in snapshot". The data view hash
match was not verified end to end.

### 5. The replay is scoped to the replaying tab (fixed)
The replay used to be global to the interceptor, so other tabs, apps and auxiliary searches could
be matched or rejected, and restoring a second snapshot silently replaced the first replay.
Now each replay only serves searches whose search session id the replaying tab registered, and
several replays can run at once. Remaining caveat: searches that reuse the tab's session id but
were not recorded (e.g. "other bucket" post-flight requests) still go through the replay. The
replay ends on "Go live", tab close, or app unmount. Each recorded response is used once, so a
refresh in a replayed tab fails with "Not in snapshot" unless passthrough is on.

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

Latest run (Import / Export view, environment details, per-tab replay, restored-data notice):
- `node scripts/jest src/platform/plugins/shared/inspector/public`: 89 passed.
- `node scripts/jest src/platform/plugins/shared/data/public/search/replay`: 10 passed (adds
  session scoping, concurrent replays, no session after dispose).
- `node scripts/jest src/platform/plugins/shared/data/public/search/search_interceptor`: 118 passed.
- `node scripts/jest` on discover `state_management`, `components/snapshot_replay_callout` and
  `hooks`: 597 passed.
- `node scripts/type_check --project src/platform/plugins/shared/{inspector,data,discover}/tsconfig.json`:
  all three pass. ESLint: no errors.

Earlier runs:
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
- `node scripts/type_check --project src/platform/plugins/shared/{inspector,data,discover}/tsconfig.json`:
  all three pass. The first discover run found 2 errors (the tab runtime state mock was missing
  `replay$`, and the test used a grid UI state field that doesn't exist); both are fixed and the
  rerun is clean.
- ESLint: no errors. Warnings remain for `EuiCallOut` content props and `KbnCallout` preferences;
  they were left as is for the prototype.
