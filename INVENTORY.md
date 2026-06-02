# Visualize Listing → Content List Migration — Inventory

## Source

- **Legacy file:** `src/platform/plugins/shared/visualizations/public/visualize_app/components/visualize_listing.tsx`
- **Plugin:** `visualizations` (`src/platform/plugins/shared/visualizations/kibana.jsonc`)
- **Entity:** `visualize` (Visualize library)
- **Branch:** `content-list/migration/visualizations/visualize`

## Reference Migration

**Chosen:** `dashboard_listing.stories.tsx` (in `kbn-content-list-docs`).

**Reason:** No production-plugin migrations to Content List exist yet — every consumer of `@kbn/content-list-*` lives inside the framework package's own `kbn-content-list-docs` stories. Among the stories, the dashboard listing is the closest structural match: it shares saved-object semantics (title/description/tags/timestamps), exposes the same edit + delete + content-editor actions, and uses sort fields `title` / `updatedAt`. `maps.stories.tsx` and `files_management.stories.tsx` are simpler than the visualize listing, so dashboard is the highest-scoring candidate.

> Docs/real-migration contradiction: none discoverable, because there is no production consumer to compare against. The stories are the only ground truth.

## Complexity Score

| Factor | Count | Score |
|---|---|---|
| Columns over 5 (4 standard + 1 custom type column = 5) | 5 | 0 |
| Custom filter widgets in legacy UI | 0 | 0 |
| Non-primitive cell types (Type column: icon + label + beta/experimental badge + error tooltip) | 1 | +1 |
| FTR test files targeting this listing (`_visualize_listing.ts`, `_add_to_dashboard.ts`) | 2 | +2 |
| Bespoke (not `TableListView` family) | No | 0 |

**Total: 3.** Tier 0–3: defaults stand (20 min/phase, 90 min overall, 2 retries).

> Note (not score-additive but call-out worthy): the legacy page is wrapped in `TabbedTableListView` and exposes a cross-plugin extension contract (`listingViewRegistry`, consumed by `event_annotation_listing`). This is treated in "Cross-plugin Contracts" below, not in the score.

## Columns

| # | Column | Current cell | Proposed mapping |
|---|---|---|---|
| 1 | Title / description | `TableListViewTable` built-in title cell, with `getOnClickTitle` (no click on `readOnly` or errored rows), `getDetailViewLink` to viz URL, description inline | `Column.Name` with `showDescription showTags`. `getHref` on provider for navigation. Disable click on `readOnly`/errored rows via item config. |
| 2 | Type | Custom column from `@kbn/visualization-listing-components/getCustomColumn`: type icon (image or `EuiIcon`) + `typeTitle` + beta/experimental `EuiBetaBadge` + error tooltip + sortable by `typeTitle` | Custom `Column` (base `Column` API per playground docs) `[proposal]` — base column renders icon + label + badge. Sortable via provider `features.sorting.fields`. See "Proposals". |
| 3 | Tags | `TableListViewTable` built-in tags column | `Column.Name` with `showTags` (per dashboard reference). |
| 4 | Last updated | `TableListViewTable` built-in `updatedAt` | `Column.UpdatedAt`. |
| 5 | Actions (edit, delete) | `TableListViewTable` built-in row actions, gated by `rowItemActions` (readOnly / managed) | `Column.Actions` with `Action.Edit`, `Action.Delete`. Restrictions via `item.actions.edit.restriction` / `item.actions.delete.restriction` (per dashboard `BulkDeleteStory`). |

## Filter / Sort Affordances

| Affordance | Current | Proposed |
|---|---|---|
| Text search | `TableListViewTable` search bar with KQL | `ContentListToolbar` search (built-in). |
| Tag filter | `TableListViewTable` tag facet (when `savedObjectsTagging` available) | `Filters.Tags`. |
| Created-by filter | `TableListViewTable` built-in | `Filters.CreatedBy`. |
| Favorites filter | `TableListViewTable` favorites | `Filters.Starred` + `features.starred: true`. |
| Sort by title | Default | `features.sorting.fields` entry `{ field: 'title', name: 'Name' }`. |
| Sort by updatedAt | Default | `features.sorting.fields` entry `{ field: 'updatedAt', name: 'Last updated' }`, `initialSort.direction: 'desc'`. |
| Custom sort by `typeTitle` (asc + desc labelled) | `getCustomSortingOptions()` adds two labelled directions | `features.sorting.fields` entry `{ field: 'typeTitle', name: 'Type' }` — directions are inherent to sort UI, the asc/desc labels collapse into the standard primitive. **DECIDE** (composes from known primitives). |
| Pagination | `initialPageSize` from `SAVED_OBJECTS_PER_PAGE_SETTING` uiSetting; limit from `SAVED_OBJECTS_LIMIT_SETTING` | `features.pagination.initialPageSize`, same uiSetting reads preserved. |

## Row Actions and Bulk Actions

| Action | Current implementation | Proposed mapping |
|---|---|---|
| Edit (row) | `rowItemActions` disables when `!visualizeCapabilities.save \|\| readOnly`, with localized reason for `managed` vs `readOnly`. Click handler runs `stateTransferService.navigateToEditor(editApp, ...)` when `editApp` present, else `history.push(editUrl)`, else `editor.onEdit(id)` | `item.actions.edit.onItemAction` calling existing `editItem` callback. `item.actions.edit.restriction` returns localized message when `readOnly`/`managed`/no save. `getItemActionHref` set for primary edit path (`editUrl`) to preserve middle-click / open-in-new-tab. **DECIDE** semantics, **PROPOSE** any new restriction-tier hook if needed. |
| Delete (bulk) | `deleteItems` calls `deleteListItems(...)`; toast notification on error | `item.actions.delete.onBulkAction` calls same helper. Toast preserved. **DECIDE.** |
| Open content editor (row) | Provided via `contentEditor.onSave` on `TableListViewTable`. Custom validator: duplicate-title warning via `hasLibraryItemWithTitle` | `features.contentEditor.open` wires the flyout; `Action.ContentEditor` row icon. Custom validator reused. **DECIDE.** |
| Create new visualization | `createItem` opens the vis-type picker modal (`showNewVisModal`) | Page-level "Create" button in `KibanaContentListPage.Header` actions wraps `showNewVisModal`. **DECIDE.** |

## Cross-plugin Contracts (not in score but consequential)

- `TabbedTableListView` wraps the page. `tabs` includes the visualize tab plus everything in `listingViewRegistry` (a `Set<TableListTab>` exposed on the visualizations plugin contract).
- Known external consumer: `src/platform/plugins/private/event_annotation_listing/public/plugin.ts` — calls `dependencies.visualizations.listingViewRegistry.add(annotationGroupsTabConfig)`.
- **Strategy:** keep `TabbedTableListView` shell intact (preserves contract). Only the **visualize tab's** `getTableList(...)` body is rebuilt around `ContentList`. Registered tabs (annotations) remain on `TableListViewTable` and are unaffected. The dashboard-flow callout stays at the top of the visualize tab.
- Removing the registry or its `TableListTab` shape would be a HARD-STOP (renames a public plugin contract). Not doing that.

## Proposals (to surface in PR)

1. **Custom Type column.** The Type column composes an icon (image or `EuiIcon`), the `typeTitle` text, optional beta/experimental badge, and an error tooltip for missing/broken visualizations. None of these are covered by the documented primitives (`Column.Name`, `Column.UpdatedAt`, `Column.CreatedBy`, `Column.Starred`, `Column.Actions`). Per the playground (`Column (Type)` example), the base `Column` API is the documented surface for this — implementation will live in `<entity>_listing` as a topic-named cell component (e.g. `visualization_type_cell.tsx`) and be passed as a child of `ContentListTable`. **PROPOSE.**

## Test Coverage (FTR)

- `src/platform/test/functional/apps/visualize/group7/_visualize_listing.ts` — core CRUD, search, edit-from-listing for the visualize tab.
- `src/platform/test/functional/apps/visualize/group7/_add_to_dashboard.ts` — visits the landing page and adds visualizations to dashboards (touches the listing entry point).
- Phase 4 subagent will migrate **only** the visualize-listing portions to Scout; unrelated paths in shared FTR files are out of scope per the skill's subagent contract.

## Test Data Sources (for screenshot seeding in Phase 5)

- **kbn archive:** `src/platform/test/functional/fixtures/kbn_archiver/visualize.json` — contains 2 saved visualizations. Load via `kbnArchiver.load(...)` or Kibana's saved-object import.
- **esArchive (supporting):** `src/platform/test/functional/fixtures/es_archiver/logstash_functional` (referenced by the visualize FTR group's `index.ts`) — provides the index data the visualizations point at.
- Combination of those two seeds the listing with real rows; Phase 5 may proceed.

## Notes / TODOs

- No documented Content List primitive exists for a tabbed shell. Strategy keeps `TabbedTableListView` rather than authoring a new shell — flagged here in case the content-list owners want to add a tabbed page primitive later.
