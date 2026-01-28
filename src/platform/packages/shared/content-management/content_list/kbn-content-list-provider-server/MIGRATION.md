# Migrating from TableListView to ContentListServerKibanaProvider

This guide documents how to migrate from `TableListView`/`TableListViewTable` to `ContentListServerKibanaProvider`. This provider uses server-side sorting, filtering, and pagination for better performance with large datasets.

## When to Use This Provider

Use `ContentListServerKibanaProvider` when:

- Working with **larger datasets** (> 10,000 items)
- Content types lack `.keyword` mappings on text fields
- Advanced search capabilities are needed (full ES query DSL)
- Multi-type searches are required
- Server-side user profile resolution is beneficial

For smaller datasets or legacy `TableListView` compatibility, use [`@kbn/content-list-provider-client`](../kbn-content-list-provider-client) instead.

---

## Quick Migration Example

**Before (TableListView):**

```tsx
<TableListViewKibanaProvider
  core={core}
  savedObjectsTagging={savedObjectsTagging}
  FormattedRelative={FormattedRelative}
>
  <TableListView
    entityName="map"
    entityNamePlural="maps"
    findItems={(searchTerm, { references }) =>
      savedObjectsClient.find({
        type: 'map',
        search: searchTerm ? `${searchTerm}*` : undefined,
        hasReference: references,
      })
    }
    deleteItems={deleteMaps}
    editItem={editMap}
    createItem={createMap}
    initialPageSize={20}
  />
</TableListViewKibanaProvider>
```

**After (ContentListServerKibanaProvider):**

```tsx
<ContentListServerKibanaProvider
  entityName="map"
  entityNamePlural="maps"
  savedObjectType="map"
  services={{
    core: coreStart,
    savedObjectsTagging: { ui: savedObjectsTagging.ui },
    favorites: favoritesService,
  }}
  item={{
    actions: {
      onEdit: editMap,
      onDelete: deleteMap,
    },
  }}
  features={{
    pagination: { initialPageSize: 20 },
    selection: { onSelectionDelete: bulkDeleteMaps },
    globalActions: { onCreate: createMap },
  }}
>
  <MyListComponent />
</ContentListServerKibanaProvider>
```

---

## Feature Mapping

| TableListView | ContentListServerKibanaProvider |
|---------------|--------------------------------|
| `entityName` | `entityName` |
| `entityNamePlural` | `entityNamePlural` |
| `findItems` | Built-in (uses `savedObjectType`) |
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
| `createdByEnabled` | Auto-enabled (server returns user info) |

---

## Server-Side Advantages

The server provider offers capabilities not available with client-side processing:

| Capability | Description |
|------------|-------------|
| **Runtime mappings** | Sort text fields without `.keyword` mappings |
| **Multi-type search** | Search across multiple saved object types |
| **Server-side filtering** | Tags, users, and starred items filtered on server |
| **User enrichment** | User profiles included in response |
| **Debounced requests** | Built-in 300ms debounce for search input |

---

## Migration Examples

### Maps (With Custom Attributes)

```tsx
<ContentListServerKibanaProvider
  entityName="map"
  entityNamePlural="maps"
  savedObjectType="map"
  searchFieldsConfig={{
    additionalAttributes: ['layerCount', 'status'],
  }}
  services={{
    core: coreStart,
    savedObjectsTagging: { ui: savedObjectsTagging.ui },
    favorites: mapsFavoritesClient,
  }}
  isReadOnly={!mapsCapabilities.save}
  item={{
    getHref: (item) => getMapUrl(item.id),
    actions: {
      onClick: (item) => goToMap(item.id),
      onEdit: editMap,
      onDelete: deleteMap,
    },
  }}
  features={{
    search: { placeholder: 'Search maps...' },
    sorting: { initialSort: { field: 'updatedAt', direction: 'desc' } },
    pagination: { initialPageSize: 20 },
    selection: { onSelectionDelete: bulkDeleteMaps },
    globalActions: { onCreate: () => navigateTo('/app/maps/create') },
  }}
>
  <MapList />
</ContentListServerKibanaProvider>
```

> **Note:** When `isReadOnly={true}`, selection and mutation actions are automatically disabled at the provider level. You don't need to conditionally set `selection`, `globalActions`, or `item.actions`.

### Multi-Type Search

```tsx
<ContentListServerKibanaProvider
  entityName="content"
  entityNamePlural="content items"
  savedObjectType={['dashboard', 'visualization', 'lens']}
  services={{
    core: coreStart,
    savedObjectsTagging: { ui: savedObjectsTagging.ui },
  }}
  transform={(item) => ({
    ...item,
    typeLabel: getTypeLabel(item.type),
    typeIcon: getTypeIcon(item.type),
  })}
  item={{
    getHref: (item) => getContentUrl(item.type, item.id),
    actions: {
      onClick: (item) => navigateToContent(item),
    },
  }}
  features={{
    sorting: {
      fields: [
        ...DEFAULT_SORT_FIELDS,
        { field: 'type', name: 'Type' },
      ],
    },
  }}
>
  <ContentList />
</ContentListServerKibanaProvider>
```

### With User Profile Display

The server provider automatically enriches items with user profile information:

```tsx
<ContentListServerKibanaProvider
  entityName="dashboard"
  entityNamePlural="dashboards"
  savedObjectType="dashboard"
  services={{
    core: coreStart,
    savedObjectsTagging: { ui: savedObjectsTagging.ui },
  }}
  // User profiles are automatically included - no extra configuration needed.
  // Items will have `createdByUser` and `updatedByUser` fields populated.
>
  <DashboardList />
</ContentListServerKibanaProvider>
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
<ContentListServerKibanaProvider
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
- Selection operations are no-ops (blocked at reducer level)
- Mutation actions (`onEdit`, `onDelete`, `onCreate`) are disabled
- Search, filtering, sorting, and pagination still work normally

### Custom Sorting with Labels

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

### Requesting Additional Attributes

When you need custom attributes for display or sorting:

```tsx
<ContentListServerKibanaProvider
  savedObjectType="dashboard"
  searchFieldsConfig={{
    additionalAttributes: ['status', 'version', 'panelCount'],
  }}
  // These attributes will be available on item.attributes
/>
```

---

## Related Documentation

- [README](./README.md) — Package overview and API reference.
- [@kbn/content-list-provider](../kbn-content-list-provider) — Core provider documentation.
- [@kbn/content-list-provider-client](../kbn-content-list-provider-client) — Client-side alternative for smaller datasets.
