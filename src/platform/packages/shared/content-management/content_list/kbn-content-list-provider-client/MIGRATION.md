# Migrating from TableListView to ContentListClientKibanaProvider

This guide documents how to migrate from `TableListView`/`TableListViewTable` to `ContentListClientKibanaProvider`. This provider uses client-side sorting, filtering, and pagination - matching the original `TableListView` behavior.

## When to Use This Provider

Use `ContentListClientKibanaProvider` when:

- **Migrating from `TableListView`** with minimal code changes.
- Working with **smaller datasets** (< 10,000 items).
- Your existing `findItems` function already handles data fetching.
- Client-side sorting and pagination overhead is acceptable.

For larger datasets, use [`@kbn/content-list-provider-server`](../kbn-content-list-provider-server) instead.

---

## Quick Migration Example

The key migration step is passing your **existing `findItems` function** directly - no changes needed!

**Before (TableListView):**

```tsx
// Your existing findItems function.
const findItems = useCallback(
  async (searchTerm, { references, referencesToExclude } = {}) => {
    return dashboardClient.search({
      search: searchTerm,
      per_page: listingLimit,
      tags: {
        included: (references ?? []).map(({ id }) => id),
        excluded: (referencesToExclude ?? []).map(({ id }) => id),
      },
    }).then(({ total, dashboards }) => ({
      total,
      hits: dashboards.map(transformToDashboardUserContent),
    }));
  },
  [listingLimit]
);

<TableListViewKibanaProvider
  core={core}
  savedObjectsTagging={savedObjectsTagging}
  FormattedRelative={FormattedRelative}
>
  <TableListView
    entityName="dashboard"
    entityNamePlural="dashboards"
    findItems={findItems}
    deleteItems={deleteDashboards}
    editItem={editDashboard}
    createItem={createDashboard}
    initialPageSize={20}
  />
</TableListViewKibanaProvider>
```

**After (ContentListClientKibanaProvider):**

```tsx
// Same findItems function - no changes!
const findItems = useCallback(
  async (searchTerm, { references, referencesToExclude } = {}) => {
    return dashboardClient.search({
      search: searchTerm,
      per_page: listingLimit,
      tags: {
        included: (references ?? []).map(({ id }) => id),
        excluded: (referencesToExclude ?? []).map(({ id }) => id),
      },
    }).then(({ total, dashboards }) => ({
      total,
      hits: dashboards.map(transformToDashboardUserContent),
    }));
  },
  [listingLimit]
);

<ContentListClientKibanaProvider
  findItems={findItems}  // Just pass your existing function!
  entityName="dashboard"
  entityNamePlural="dashboards"
  services={{
    core: coreStart,
    savedObjectsTagging: { ui: savedObjectsTagging.ui },
    favorites: favoritesService,
  }}
  item={{
    actions: {
      onEdit: editDashboard,
      onDelete: deleteDashboard,
    },
  }}
  features={{
    pagination: { initialPageSize: 20 },
    selection: { onSelectionDelete: bulkDeleteDashboards },
    globalActions: { onCreate: createDashboard },
  }}
>
  <MyListComponent />
</ContentListClientKibanaProvider>
```

---

## Feature Mapping

| TableListView | ContentListClientKibanaProvider |
|---------------|--------------------------------|
| `findItems` | `findItems` (pass directly!) |
| `entityName` | `entityName` |
| `entityNamePlural` | `entityNamePlural` |
| `deleteItems` | `features.selection.onSelectionDelete` |
| `editItem` | `item.actions.onEdit` |
| `createItem` | `features.globalActions.onCreate` |
| `initialPageSize` | `features.pagination.initialPageSize` |
| `getDetailViewLink` | `item.getHref` |
| `getOnClickTitle` | `item.actions.onClick` |
| `customTableColumn` | Use `<Column>` in `ContentListTable` |
| `customSortingOptions` | `features.sorting.fields` |
| `emptyPrompt` | `emptyState` prop on `ContentListTable` |
| `initialFilter` | `features.search.initialQuery` |

---

## Migration Examples

### Dashboard (Full-Featured)

```tsx
// Your existing findItems - unchanged!
const findItems = useCallback(
  async (searchTerm, { references, referencesToExclude } = {}) => {
    return findService.search({
      search: searchTerm,
      per_page: listingLimit,
      tags: {
        included: (references ?? []).map(({ id }) => id),
        excluded: (referencesToExclude ?? []).map(({ id }) => id),
      },
    }).then(({ total, dashboards }) => ({
      total,
      hits: dashboards.map(transformToDashboardUserContent),
    }));
  },
  [listingLimit]
);

<ContentListClientKibanaProvider
  findItems={findItems}
  entityName="dashboard"
  entityNamePlural="dashboards"
  services={{
    core: coreStart,
    savedObjectsTagging: { ui: savedObjectsTagging.ui },
    favorites: dashboardFavoritesClient,
  }}
  isReadOnly={!showWriteControls}
  item={{
    getHref: (item) => getDashboardUrl(item.id),
    actions: {
      onClick: (item) => goToDashboard(item.id),
      onEdit: editDashboard,
      onDelete: deleteDashboard,
    },
  }}
  features={{
    search: { placeholder: 'Search dashboards...' },
    sorting: { initialSort: { field: 'updatedAt', direction: 'desc' } },
    pagination: { initialPageSize: 20 },
    selection: { onSelectionDelete: bulkDeleteDashboards },
    globalActions: { onCreate: () => navigateTo('/app/dashboard/create') },
  }}
>
  <DashboardList />
</ContentListClientKibanaProvider>
```

> **Note:** When `isReadOnly={true}`, selection and mutation actions are automatically disabled at the provider level. You don't need to conditionally set `selection`, `globalActions`, or `item.actions`.

### Maps (Simple CRUD)

```tsx
const findMaps = useCallback(
  async (searchTerm, { references = [], referencesToExclude = [] } = {}) => {
    return getMapClient().search({
      text: searchTerm ? `${searchTerm}*` : undefined,
      limit: listingLimit,
      tags: {
        included: references.map(({ id }) => id),
        excluded: referencesToExclude.map(({ id }) => id),
      },
    }).then(({ hits, pagination: { total } }) => ({
      total,
      hits: hits.map(toTableListViewSavedObject),
    }));
  },
  [listingLimit]
);

<ContentListClientKibanaProvider
  findItems={findMaps}
  entityName="map"
  entityNamePlural="maps"
  services={{
    core: coreStart,
    savedObjectsTagging: { ui: savedObjectsTagging.ui },
  }}
  isReadOnly={isReadOnly}
  item={{
    actions: {
      onClick: (item) => history.push(getEditPath(item.id)),
    },
  }}
  features={{
    pagination: { initialPageSize },
    globalActions: { onCreate: navigateToNewMap },
    selection: { onSelectionDelete: deleteMaps },
  }}
>
  <MapList />
</ContentListClientKibanaProvider>
```

### Graph (Minimal)

```tsx
const findItems = useCallback(
  (search: string) => {
    return findSavedWorkspace(
      { contentClient, basePath: coreStart.http.basePath },
      search,
      listingLimit
    ).then(({ total, hits }) => ({
      total,
      hits: hits.map(toTableListViewSavedObject),
    }));
  },
  [coreStart.http.basePath, listingLimit, contentClient]
);

<ContentListClientKibanaProvider
  findItems={findItems}
  entityName="graph"
  entityNamePlural="graphs"
  services={{
    core: coreStart,
    savedObjectsTagging: { ui: savedObjectsTagging.ui },
  }}
  isReadOnly={!capabilities.graph.save}
  item={{
    getHref: ({ id }) => getEditUrl(addBasePath, { id }),
    actions: {
      onClick: (item) => history.push(getEditPath(item)),
    },
  }}
  features={{
    pagination: { initialPageSize },
    globalActions: { onCreate: () => history.push(getNewPath()) },
    selection: {
      onSelectionDelete: capabilities.graph.delete ? deleteItems : undefined,
    },
  }}
>
  <GraphList />
</ContentListClientKibanaProvider>
```

---

## Common Patterns

### Read-Only Mode

The `isReadOnly` prop automatically disables selection, bulk actions, and item mutation actions. You don't need to conditionally configure these.

```tsx
// Before
<TableListView
  createItem={canWrite ? createFn : undefined}
  deleteItems={canWrite ? deleteFn : undefined}
  editItem={canWrite ? editFn : undefined}
/>

// After - much simpler!
<ContentListClientKibanaProvider
  findItems={findItems}
  isReadOnly={!canWrite}
  features={{
    globalActions: { onCreate: createFn },
    selection: { onSelectionDelete: deleteFn },
  }}
  item={{
    actions: {
      onEdit: editFn,
      onDelete: deleteFn,
    },
  }}
/>
```

When `isReadOnly={true}`:
- Selection operations are no-ops (blocked at reducer level).
- Mutation actions (`onEdit`, `onDelete`, `onCreate`) are disabled.
- Search, filtering, sorting, and pagination still work normally.

### Custom Sorting Options

```tsx
// Before
customSortingOptions={{
  options: [
    { field: 'type', direction: 'asc', label: 'Type A-Z' },
    { field: 'type', direction: 'desc', label: 'Type Z-A' },
  ],
}}

// After
features={{
  sorting: {
    fields: [
      ...DEFAULT_SORT_FIELDS,
      {
        field: 'type',
        name: 'Type',
        ascLabel: 'Type A-Z',
        descLabel: 'Type Z-A',
      },
    ],
  },
}}
```

### Initial Search Query from URL

```tsx
// Before
<TableListView initialFilter={urlParams.filter} />

// After
<ContentListClientKibanaProvider
  findItems={findItems}
  features={{
    search: { initialQuery: urlParams.filter },
  }}
/>
```

---

## Related Documentation

- [README](./README.md) — Package overview and API reference.
- [@kbn/content-list-provider](../kbn-content-list-provider) — Core provider documentation.
- [@kbn/content-list-provider-server](../kbn-content-list-provider-server) — Server-side alternative for larger datasets.
