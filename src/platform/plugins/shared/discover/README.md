# Discover

Contains the Discover application and the saved search embeddable.

## Project tree

### [src/platform/plugins/shared/discover/public](./public)

Contains all the client-only code. When you initially load Discover, [public/application/main](./public/application/main) is executed and displayed.

- **[/application](./public/application)** \
  One folder for every "route", each folder contains files and folders related only to this route.
  - **[/context](./public/application/context)** (Also known as "Surrounding documents" - historically this has been a separate plugin)
  - **[/doc](./public/application/doc)** (Also known as "Single document" - historically this has been a separate plugin)
  - **[/main](./public/application/main)** (Main part of Discover containing the document table)
  - **[/not_found](./public/application/not_found)** (Rendered when a route can't be found)
  - **[/view_alert](./public/application/view_alert)** (Forwarding links in alert notifications)
- **[/components](./public/components)** (All React components used in more than just one app)
- **[/embeddable](./public/embeddable)** (Code related to the Discover session embeddable, rendered on dashboards)
- **[/hooks](./public/hooks)** (Code containing React hooks)
- **[/services](./public/services)** (Services either for external or internal use)
- **[/utils](./public/utils)** (All utility functions used across more than one application)

### [src/platform/plugins/shared/discover/server](./server)

Contains all the server-only code.

- **[/sample_data](./server/sample_data)** (Registrations with the Sample Data Registry for Discover saved objects)
- **[/capabilities_provider](./server/capabilities_provider.ts)** (CapabilitiesProvider definition of capabilities for Core)
- **[/ui_settings](./server/ui_settings.ts)** (Settings and the default values for UiSettingsServiceSetup )
- **[/locator](./server/locator)** (Extensions of DiscoverAppLocator for the DiscoverServerPlugin API)

### [src/platform/plugins/shared/discover/common](./common))

Contains all code shared by client and server.

- **[/constants](./common/constants.ts)** (General contants)
- **[/field_types](./common/field_types.ts)** (Field types constants)
- **[/locator](./common/locator)** (Registration with the URL service for BWC deep-linking to Discover views.)

## Telemetry

Discover uses custom EBT events for product telemetry, standard `performance_metric` events for durations, and `trackUiMetric` UI counters for legacy usage counts. EBT registrations live in [public/ebt_manager/discover_ebt_manager_registrations.ts](./public/ebt_manager/discover_ebt_manager_registrations.ts).

All Discover EBT events can include the `discover_context` context provider. Its `discoverProfiles` field contains the active Discover context-awareness profile IDs.

### Custom EBT Events

Each custom EBT event has an event type and a schema. The `eventName` field, when present, is the action name inside that event type.

#### `discover_field_usage`

Tracks field interactions in Discover, including table column selection/removal and filter creation.

| Event name           | Description                                    |
| -------------------- | ---------------------------------------------- |
| `dataTableSelection` | A field was added to the Discover table.       |
| `dataTableRemoval`   | A field was removed from the Discover table.   |
| `filterAddition`     | A filter was created from a field interaction. |

| Field             | Type                 | Description                                                                     |
| ----------------- | -------------------- | ------------------------------------------------------------------------------- |
| `eventName`       | `keyword`            | Field usage action.                                                             |
| `fieldName`       | `keyword` (optional) | ECS field name when known, or `<non-ecs>` for non-ECS fields.                   |
| `filterOperation` | `keyword` (optional) | Filter operation when `eventName` is `filterAddition`: `+`, `-`, or `_exists_`. |

#### `discover_query_fields_usage`

Tracks field names extracted from submitted KQL and ES|QL queries.

| Event name  | Description                                   |
| ----------- | --------------------------------------------- |
| `kqlQuery`  | A KQL query was analyzed for field usage.     |
| `esqlQuery` | An ES\|QL query was analyzed for field usage. |

| Field        | Type        | Description                                                                                                                           |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `eventName`  | `keyword`   | Query language analyzed: `kqlQuery` or `esqlQuery`.                                                                                   |
| `fieldNames` | `keyword[]` | Field names found in the query. ECS fields are recorded by name, non-ECS fields as `<non-ecs>`, and free-text KQL as `__FREE_TEXT__`. |

#### `discover_query_performance`

Tracks timing and request-shape metadata when Discover completes a main fetch request or a fetch-more request. The same fetches are also reported as standard `performance_metric` events.

| Event name                     | Description                                      |
| ------------------------------ | ------------------------------------------------ |
| `discoverFetchAll`             | A main Discover fetch completed (table + chart). |
| `discoverFetchAllRequestsOnly` | A main Discover fetch completed (table only).    |
| `discoverFetchMore`            | A fetch-more request completed (table only).     |

| Field                | Type                 | Description                                                                                              |
| -------------------- | -------------------- | -------------------------------------------------------------------------------------------------------- |
| `eventName`          | `keyword`            | Query performance action.                                                                                |
| `duration`           | `integer`            | Fetch duration in milliseconds.                                                                          |
| `queryRangeSeconds`  | `long`               | Absolute time range covered by the query, in seconds.                                                    |
| `phraseQueryCount`   | `integer`            | Number of phrase queries found in inspected Elasticsearch requests.                                      |
| `multiMatchTypes`    | `keyword[]`          | Multi-match query types found in inspected Elasticsearch requests.                                       |
| `fetchType`          | `keyword`            | Fetch implementation: `fetchTextBased` for ES\|QL fetches, or `fetchDocuments` for classic mode fetches. |
| `querySourceCommand` | `keyword` (optional) | ES\|QL source command, such as `FROM`, `TS`, or `PROMQL`; omitted when unavailable.                      |

#### `discover_profile_resolved`

Tracks context-awareness profile resolution at root, data source, or document level. Duplicate resolutions for the same level/profile are skipped.

| Event name | Description                                                                               |
| ---------- | ----------------------------------------------------------------------------------------- |
| None       | This event type does not include `eventName`; `contextLevel` and `profileId` describe it. |

| Field          | Type      | Description                                                                           |
| -------------- | --------- | ------------------------------------------------------------------------------------- |
| `contextLevel` | `keyword` | Profile resolution level, such as `rootLevel`, `dataSourceLevel`, or `documentLevel`. |
| `profileId`    | `keyword` | Resolved active profile ID.                                                           |

#### `discover_tabs`

Tracks tab lifecycle and navigation interactions in Discover.

| Event name                  | Description                                               |
| --------------------------- | --------------------------------------------------------- |
| `tabCreated`                | A new Discover tab was created.                           |
| `tabClosed`                 | A Discover tab was closed.                                |
| `tabSwitched`               | The active Discover tab changed.                          |
| `tabReordered`              | A Discover tab was moved to a new position.               |
| `tabDuplicated`             | A Discover tab was duplicated.                            |
| `tabClosedOthers`           | All other Discover tabs were closed.                      |
| `tabClosedToTheRight`       | Discover tabs to the right of the target tab were closed. |
| `tabRenamed`                | A Discover tab was renamed.                               |
| `tabsLimitReached`          | The maximum number of open Discover tabs was reached.     |
| `tabsKeyboardShortcutsUsed` | A keyboard shortcut was used for tab navigation.          |
| `tabsRestoredOnLoad`        | Discover tabs were restored when the app loaded.          |
| `tabSelectRecentlyClosed`   | A recently closed Discover tab was selected.              |

| Field                | Type                 | Description                                                                                |
| -------------------- | -------------------- | ------------------------------------------------------------------------------------------ |
| `eventName`          | `keyword`            | Tab action.                                                                                |
| `totalTabsOpen`      | `integer` (optional) | Total number of open tabs at the time of the event.                                        |
| `remainingTabsCount` | `integer` (optional) | Number of tabs remaining after the event.                                                  |
| `closedTabsCount`    | `integer` (optional) | Number of tabs closed in a single action.                                                  |
| `tabId`              | `keyword` (optional) | Unique identifier of the tab.                                                              |
| `fromIndex`          | `integer` (optional) | Original index of the tab being moved.                                                     |
| `toIndex`            | `integer` (optional) | New index of the tab being moved.                                                          |
| `shortcutUsed`       | `keyword` (optional) | Tab keyboard shortcut used: `moveLeft`, `moveRight`, `moveHome`, `moveEnd`, or `closeTab`. |

#### `discover_cascade`

Tracks cascaded document expansion/collapse, opt-out, and open-in-new-tab actions.

| Event name                                   | Description                                                    |
| -------------------------------------------- | -------------------------------------------------------------- |
| `cascaded_documents_expanded`                | Cascaded documents were expanded.                              |
| `cascaded_documents_collapsed`               | Cascaded documents were collapsed.                             |
| `cascaded_documents_opt_out`                 | The user opted out of cascaded documents.                      |
| `cascaded_documents_open_in_new_tab_clicked` | The open-in-new-tab action was clicked for cascaded documents. |

| Field       | Type                 | Description                                           |
| ----------- | -------------------- | ----------------------------------------------------- |
| `eventName` | `keyword`            | Cascade action.                                       |
| `tabId`     | `keyword`            | ID of the tab where the cascade interaction occurred. |
| `nodeId`    | `keyword` (optional) | ID of the cascaded document node, when applicable.    |

#### `discover_in_dashboard`

Tracks Discover session saves from a dashboard and tab switches inside embedded Discover panels.

| Event name     | Description                                               |
| -------------- | --------------------------------------------------------- |
| `savedSession` | A Discover session was saved from a dashboard.            |
| `tabSwitched`  | The active tab changed inside an embedded Discover panel. |

| Field               | Type                 | Description                                                     |
| ------------------- | -------------------- | --------------------------------------------------------------- |
| `eventName`         | `keyword`            | Dashboard embedding action.                                     |
| `dashboardId`       | `keyword` (optional) | Dashboard identifier.                                           |
| `embeddablePanelId` | `keyword` (optional) | Embeddable panel instance identifier within the dashboard.      |
| `savedSessionId`    | `keyword` (optional) | Discover session identifier; present for `savedSession` events. |
| `tabSwitchedFromId` | `keyword` (optional) | Source tab identifier; present for `tabSwitched` events.        |
| `tabSwitchedToId`   | `keyword` (optional) | Destination tab identifier; present for `tabSwitched` events.   |

### Standard Performance Metrics

These events are reported through `reportPerformanceMetricEvent` and use the shared `performance_metric` event type. Query performance fetches are also reported as the custom `discover_query_performance` EBT event described above.

| Event name                     | Description                                      |
| ------------------------------ | ------------------------------------------------ |
| `discoverLoadSavedSearch`      | A Discover tab finished loading.                 |
| `discoverSurroundingDocsFetch` | A Surrounding documents fetch completed.         |
| `discoverFetchAll`             | A main Discover fetch completed (table + chart). |
| `discoverFetchAllRequestsOnly` | A main Discover fetch completed (table only).    |
| `discoverFetchMore`            | A fetch-more request completed (table only).     |

| Field                    | Type                   | Description                                                                                                                                                                                                         |
| ------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `eventName`              | `keyword`              | Performance metric action.                                                                                                                                                                                          |
| `duration`               | `integer`              | Event duration in milliseconds.                                                                                                                                                                                     |
| `meta.fetchType`         | `keyword` (optional)   | Fetch type. For `discoverSurroundingDocsFetch`: `all`, `predecessors`, `successors`, or `context`. For query performance events: `fetchTextBased` for ES\|QL fetches, or `fetchDocuments` for classic mode fetches. |
| `meta.multi_match_types` | `keyword[]` (optional) | Multi-match query types found in inspected Elasticsearch requests for query performance events.                                                                                                                     |
| `key1`                   | `keyword` (optional)   | Set to `query_range_secs` for query performance events.                                                                                                                                                             |
| `value1`                 | `long` (optional)      | Absolute time range covered by the query, in seconds, when `key1` is `query_range_secs`.                                                                                                                            |
| `key2`                   | `keyword` (optional)   | Set to `phrase_query_count` for query performance events.                                                                                                                                                           |
| `value2`                 | `integer` (optional)   | Number of phrase queries found in inspected Elasticsearch requests when `key2` is `phrase_query_count`.                                                                                                             |

### UI Counters

These counters are reported with `usageCollection.reportUiCounter('discover', ...)` through `trackUiMetric`.

| Metric type | Event name                     | Description                                                |
| ----------- | ------------------------------ | ---------------------------------------------------------- |
| `click`     | `field_statistics_view_click`  | The user switched to the field statistics view.            |
| `click`     | `pattern_analysis_view_click`  | The user switched to the pattern analysis view.            |
| `click`     | `documents_view_click`         | The user switched to the documents view.                   |
| `click`     | `esql:try_btn_clicked`         | The user switched from data view mode to ES\|QL mode.      |
| `click`     | `esql:back_to_classic_clicked` | The user switched from ES\|QL mode back to data view mode. |
| `click`     | `esql_filter_added`            | A filter was added while in ES\|QL mode.                   |
| `click`     | `filter_added`                 | A filter was added while in data view mode.                |
| `loaded`    | `field_statistics_loaded`      | The field statistics table loaded.                         |
| `loaded`    | `pattern_analysis_loaded`      | The pattern analysis table loaded.                         |
| `count`     | `ad_hoc_data_view`             | Discover rendered with an ad hoc data view.                |

## Feature flags

See the [Feature flag service](https://docs.elastic.dev/kibana-dev-docs/tutorials/feature-flags-service#dynamic-config) documentation for details on how to use feature flags.

Set constants for feature flag keys in [public/constants.ts](./public/constants.ts).

These are the feature flags used by Discover:
