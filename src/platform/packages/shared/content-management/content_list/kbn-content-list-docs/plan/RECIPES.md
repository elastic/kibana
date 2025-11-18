# ContentList Recipes and Examples

## Document Purpose

This document provides practical code examples for using the ContentList components. It serves as a reference for common usage patterns and migration guides.

**Related Documents:**
- **[LISTING_COMPONENT.md](./LISTING_COMPONENT.md)** - Component API specifications
- **[LISTING_PROVIDER.md](./LISTING_PROVIDER.md)** - Provider implementation details
- **[CLIENT_VS_SERVER.md](./CLIENT_VS_SERVER.md)** - When to use Client vs Server providers
- **[PLAN.md](./PLAN.md)** - Implementation phases

---

## Table of Contents

1. [Quick Start Examples](#quick-start-examples)
2. [Client vs Server Providers](#client-vs-server-providers)
3. [Transform Function Examples](#transform-function-examples)
4. [Usage Patterns](#usage-patterns)
5. [Migration Examples](#migration-examples)
6. [Smart Defaults in Action](#smart-defaults-in-action)
7. [Package Import Strategies](#package-import-strategies)
8. [Expandable Row Details](#expandable-row-details)

---

## Quick Start Examples

### Client Provider (Migrating from TableListView)

Use `ContentListClientKibanaProvider` when migrating from `TableListView`. It accepts your existing `findItems` function and handles client-side sorting/pagination.

```tsx
import { ContentListClientKibanaProvider } from '@kbn/content-list-provider-client';
import { ContentListTable } from '@kbn/content-list-table';
import { ContentListToolbar } from '@kbn/content-list-toolbar';

// Your existing findItems function - no changes needed.
const findItems = async (searchQuery, refs) => {
  return dashboardClient.search({ search: searchQuery, ...refs });
};

<ContentListClientKibanaProvider
  findItems={findItems}
  transform={dashboardTransform}
  entityName="dashboard"
  entityNamePlural="dashboards"
  services={{
    core: coreStart,
    savedObjectsTagging: taggingService,
    favorites: favoritesService,
  }}
  features={{
    search: { placeholder: 'Search dashboards...' },
    selection: { onSelectionDelete: deleteDashboards },
  }}
>
  <ContentListToolbar />
  <ContentListTable />
</ContentListClientKibanaProvider>
```

### Server Provider (New Implementations)

Use `ContentListServerKibanaProvider` for new implementations. It uses the server-side `/list` endpoint.

```tsx
import { ContentListServerKibanaProvider } from '@kbn/content-list-provider-server';
import { ContentListTable } from '@kbn/content-list-table';
import { ContentListToolbar } from '@kbn/content-list-toolbar';

<ContentListServerKibanaProvider
  savedObjectType="map"
  entityName="map"
  entityNamePlural="maps"
  services={{
    core: coreStart,
    savedObjectsTagging: taggingService,
    favorites: favoritesService,
  }}
  features={{
    search: { placeholder: 'Search maps...' },
    selection: { onSelectionDelete: deleteMaps },
  }}
>
  <ContentListToolbar />
  <ContentListTable />
</ContentListServerKibanaProvider>
```

### Embedded Usage (Tests/Storybook)

```tsx
import { ContentListProvider } from '@kbn/content-list-provider';

<EuiFlyout onClose={onClose}>
  <EuiFlyoutHeader>
    <EuiTitle><h2>Select a file</h2></EuiTitle>
  </EuiFlyoutHeader>
  
  <EuiFlyoutBody>
    <ContentListProvider
      entityName="file"
      entityNamePlural="files"
      dataSource={{ findItems: mockFindItems }}
      services={{ tags: { getTagList: () => [] } }}
    >
      <ContentListToolbar />
      <ContentListTable />
    </ContentListProvider>
  </EuiFlyoutBody>
</EuiFlyout>
```

### Read-Only Mode

```tsx
<ContentListClientKibanaProvider
  findItems={findMaps}
  isReadOnly={!hasWritePermission}
  entityName="map"
  entityNamePlural="maps"
  services={{ core: coreStart, savedObjectsTagging: taggingService }}
  item={{
    actions: { onEdit: editMap },  // Ignored when isReadOnly=true.
  }}
  features={{
    selection: { onSelectionDelete: deleteMaps },  // Ignored when isReadOnly=true.
  }}
>
  <ContentListToolbar />
  <ContentListTable />
</ContentListClientKibanaProvider>
```

---

## Client vs Server Providers

### When to Use Client Provider

Use `ContentListClientKibanaProvider` when:

- **Migrating from `TableListView`** - Your existing `findItems` works unchanged.
- **Consumer handles filtering** - Your backend already supports search/tag filtering.
- **Large result sets** - Client-side sorting/pagination avoids repeated server calls.

**How it works:**
1. Calls your `findItems` when search query or tags change.
2. Caches results to avoid re-fetches on sort/page changes.
3. Resolves usernames to UIDs using cached user profiles.
4. Filters favorites client-side.

### When to Use Server Provider

Use `ContentListServerKibanaProvider` when:

- **New implementations** - Starting fresh without existing `findItems`.
- **Large datasets** - Server-side pagination is more efficient.
- **Full filter support** - Server resolves usernames, emails, and `no-user`.

**How it works:**
1. Calls `/internal/content_management/list` endpoint.
2. Server handles sorting, pagination, and filtering.
3. Server resolves usernames/emails to UIDs.
4. Returns user profile data for avatars.

### Comparison Table

| Feature | Client Provider | Server Provider |
|---------|-----------------|-----------------|
| Existing `findItems` | Uses as-is | Not used |
| Sort/page re-fetch | Cached | Server call |
| Username filter | Known users only | All users |
| `no-user` filter | Client-side | Server-side |
| User avatars | Via profiles | Embedded |

---

## Transform Function Examples

The `transform` function converts raw items to the standardized `ContentListItem` format.

### Default Transform (Elasticsearch SavedObject)

```typescript
// No transform needed for UserContentCommonSchema types
<ContentListClientKibanaProvider
  entityName="dashboard"
  entityNamePlural="dashboards"
  savedObjectType="dashboard"
  savedObjectsTagging={savedObjectsTagging}
  core={core}
>
  <ContentListTable />
</ContentListClientKibanaProvider>
```

### Custom Transform

```typescript
import type { TransformFunction, ContentListItem } from '@kbn/content-list-provider';

interface CustomApiResponse {
  uuid: string;
  name: string;
  summary?: string;
  lastModified: number;
  author: { name: string };
}

const customTransform: TransformFunction<CustomApiResponse> = (item) => ({
  id: item.uuid,
  title: item.name,
  description: item.summary,
  updatedAt: new Date(item.lastModified),
  updatedBy: item.author.name,
});

<ContentListProvider<CustomApiResponse>
  entityName="report"
  entityNamePlural="reports"
  dataSource={{
    findItems: fetchReports,
    transform: customTransform,
  }}
>
  <ContentListTable />
</ContentListProvider>
```

### ContentListItem Interface

```typescript
interface ContentListItem {
  id: string;              // Required
  title: string;           // Required
  description?: string;
  type?: string;
  updatedAt?: Date;
  createdAt?: Date;
  updatedBy?: string;
  createdBy?: string;
  tags?: string[];
  [key: string]: unknown;  // Custom fields
}
```

---

## Usage Patterns

### Pattern 1: Simple Listing (Default Experience)

```tsx
import { ContentListClientKibanaProvider } from '@kbn/content-list-provider';
import { ContentListTable } from '@kbn/content-list-table';
import { ContentListToolbar } from '@kbn/content-list-toolbar';
import { ContentListFooter } from '@kbn/content-list-footer';

function DashboardListing() {
  return (
    <ContentListClientKibanaProvider
      entityName="dashboard"
      entityNamePlural="dashboards"
      savedObjectType="dashboard"
      savedObjectsTagging={savedObjectsTagging}
      core={core}
      features={{
        selection: { onSelectionDelete: deleteDashboards },
        globalActions: { onCreate: createDashboard },
      }}
    >
      <ContentListToolbar />
      <ContentListTable />
      <ContentListFooter />
    </ContentListClientKibanaProvider>
  );
}
```

### Pattern 2: Grid Layout

```tsx
import { ContentListGrid, ViewModeToggle } from '@kbn/content-list-grid';

function VisualizationLibrary() {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');

  return (
    <ContentListClientKibanaProvider
      entityName="visualization"
      entityNamePlural="visualizations"
      savedObjectType="visualization"
      savedObjectsTagging={savedObjectsTagging}
      core={core}
    >
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <ContentListToolbar />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
        </EuiFlexItem>
      </EuiFlexGroup>
      
      {viewMode === 'table' ? (
        <ContentListTable />
      ) : (
        <ContentListGrid iconType="visualizeApp" />
      )}
    </ContentListClientKibanaProvider>
  );
}
```

### Pattern 3: Custom Table with Additional Content

```tsx
function SavedObjectsListing() {
  return (
    <ContentListClientKibanaProvider
      entityName="saved object"
      entityNamePlural="saved objects"
      savedObjectType="*"
      savedObjectsTagging={savedObjectsTagging}
      core={core}
    >
      <EuiCallOut title="Import saved objects" iconType="importAction">
        <p>You can also import saved objects from a file.</p>
        <EuiButton onClick={openImportModal}>Import</EuiButton>
      </EuiCallOut>
      
      <EuiSpacer />
      
      <ContentListToolbar />
      
      <ContentListTable>
        <Column.Name />
        <Column
          id="type"
          name="Type"
          render={(item) => <ObjectTypeIcon type={item.type} />}
        />
        <Column.UpdatedAt />
        <Column.Actions />
      </ContentListTable>
      
      <EuiText size="s" color="subdued">
        <p>Showing objects from all accessible spaces</p>
      </EuiText>
    </ContentListClientKibanaProvider>
  );
}
```

### Pattern 4: Completely Custom UI

```tsx
function CustomListing() {
  return (
    <ContentListClientKibanaProvider
      entityName="report"
      entityNamePlural="reports"
      savedObjectType="report"
      savedObjectsTagging={savedObjectsTagging}
      core={core}
    >
      <CustomListingImplementation />
    </ContentListClientKibanaProvider>
  );
}

function CustomListingImplementation() {
  const { items, isLoading } = useContentListItems();
  const { queryText, setSearch } = useContentListSearch();
  const { selectedItems, toggleSelection } = useContentListSelection();
  
  return (
    <div>
      <MyCustomSearchBar onSearch={setSearch} value={queryText} />
      <MyCustomFilters />
      
      {isLoading ? (
        <MyCustomLoader />
      ) : (
        <MyCustomCardLayout
          items={items}
          selected={selectedItems}
          onSelect={toggleSelection}
        />
      )}
      
      <MyCustomPagination />
    </div>
  );
}
```

---

## Migration Examples

### Migration 1: Maps (Using Server Provider)

Maps uses the server provider since it doesn't have complex existing `findItems` logic.

**Before:**

```tsx
<TableListView<MapUserContent>
  id="map"
  headingId="mapsListingPage"
  onCreate={isReadOnly ? undefined : navigateToNewMap}
  findItems={findMaps}
  onDelete={isReadOnly ? undefined : deleteMaps}
  initialFilter={''}
  initialPageSize={initialPageSize}
  entityName="map"
  entityNamePlural="maps"
  title={APP_NAME}
  getOnClickTitle={({ id }) => () => history.push(getEditPath(id))}
/>
```

**After (Server Provider):**

```tsx
import { ContentListServerKibanaProvider } from '@kbn/content-list-provider-server';

<ContentListServerKibanaProvider
  savedObjectType="map"
  entityName="map"
  entityNamePlural="maps"
  services={{
    core: coreStart,
    savedObjectsTagging: taggingService,
    favorites: favoritesService,
  }}
  isReadOnly={isReadOnly}
  features={{
    pagination: { initialPageSize },
    selection: { onSelectionDelete: deleteMaps },
    globalActions: { onCreate: navigateToNewMap },
  }}
  item={{
    actions: {
      onClick: ({ id }) => history.push(getEditPath(id)),
    },
  }}
>
  <ContentListToolbar />
  <ContentListTable />
</ContentListServerKibanaProvider>
```

### Migration 2: Dashboard (Using Client Provider)

Dashboard uses the client provider to reuse its existing `findItems` implementation.

**Before:**

```tsx
const tableListViewTableProps = useMemo(() => ({
  contentEditor: { isReadonly: !showWriteControls, onSave: updateItemMeta },
  createItem: !showWriteControls ? undefined : createItem,
  deleteItems: !showWriteControls ? undefined : deleteItems,
  editItem: !showWriteControls ? undefined : editItem,
  entityName,
  entityNamePlural,
  findItems,
  getDetailViewLink,
  initialFilter,
  initialPageSize,
  createdByEnabled: true,
}), [/* dependencies */]);

<TableListView {...tableListViewTableProps}>
  <DashboardUnsavedListing />
</TableListView>
```

**After (Client Provider):**

```tsx
import { ContentListClientKibanaProvider } from '@kbn/content-list-provider-client';

// Existing findItems from useDashboardListingTable - unchanged.
const { findItems, transform } = useDashboardListingTable();

<ContentListClientKibanaProvider
  findItems={findItems}
  transform={transform}
  entityName="dashboard"
  entityNamePlural="dashboards"
  services={{
    core: coreStart,
    savedObjectsTagging: taggingService,
    favorites: favoritesService,
  }}
  isReadOnly={!showWriteControls}
  features={{
    search: { initialQuery: initialFilter },
    pagination: { initialPageSize },
    selection: { onSelectionDelete: deleteItems },
    globalActions: { onCreate: createItem },
    contentEditor: { onSave: updateItemMeta },
  }}
  item={{
    getHref: getDetailViewLink,
    actions: { onEdit: editItem },
  }}
>
  <DashboardUnsavedListing />
  <ContentListToolbar />
  <ContentListTable />
</ContentListClientKibanaProvider>
```

### Key Migration Differences

| TableListView Prop | Client Provider | Server Provider |
|--------------------|-----------------|-----------------|
| `findItems` | `findItems` prop | Not needed |
| `savedObjectType` | Not needed | `savedObjectType` prop |
| `createItem` | `features.globalActions.onCreate` | Same |
| `deleteItems` | `features.selection.onSelectionDelete` | Same |
| `contentEditor` | `features.contentEditor` | Same |
| `createdByEnabled` | Auto-enabled with user profiles | Auto-enabled |
| `getOnClickTitle` | `item.actions.onClick` | Same |
| `getDetailViewLink` | `item.getHref` | Same |

---

## Smart Defaults in Action

### Zero Config

Components auto-render based on provider features:

```tsx
<ContentListClientKibanaProvider
  entityName="dashboard"
  entityNamePlural="dashboards"
  savedObjectType="dashboard"
  savedObjectsTagging={savedObjectsTagging}
  core={core}
  features={{
    selection: { onSelectionDelete: deleteItems },
  }}
>
  {/* Auto-renders: SearchBox, Filters (Sort, Tags, CreatedBy), SelectionActions */}
  <ContentListToolbar />
  <ContentListTable />
  <ContentListFooter />
</ContentListClientKibanaProvider>
```

### Explicit Override

Override defaults with custom structure:

```tsx
<ContentListToolbar>
  <ContentListToolbar.Filters>
    <SortFilter />
    <TagsFilter />
  </ContentListToolbar.Filters>
  <ContentListToolbar.Button iconType="inspect" onClick={handleDiagnostics}>
    Diagnostics
  </ContentListToolbar.Button>
  <ContentListToolbar.SelectionActions>
    <DeleteAction />
  </ContentListToolbar.SelectionActions>
</ContentListToolbar>
```

---

## Package Import Strategies

### Strategy 1: Client Provider (TableListView Migration)

```tsx
import { ContentListClientKibanaProvider } from '@kbn/content-list-provider-client';
import { ContentListTable } from '@kbn/content-list-table';
import { ContentListToolbar } from '@kbn/content-list-toolbar';
```

### Strategy 2: Server Provider (New Implementations)

```tsx
import { ContentListServerKibanaProvider } from '@kbn/content-list-provider-server';
import { ContentListTable } from '@kbn/content-list-table';
import { ContentListToolbar } from '@kbn/content-list-toolbar';
```

### Strategy 3: Base Provider (Tests/Storybook)

```tsx
import { ContentListProvider } from '@kbn/content-list-provider';
import { ContentListTable } from '@kbn/content-list-table';
import { ContentListToolbar } from '@kbn/content-list-toolbar';
```

### Strategy 4: Custom UI with Hooks

```tsx
import {
  ContentListProvider,
  useContentListItems,
  useContentListSearch,
  useContentListSelection,
  useContentListFilters,
} from '@kbn/content-list-provider';

// Build completely custom UI using hooks.
```

### Strategy 5: Grid with View Mode Toggle

```tsx
import { ContentListGrid, ViewModeToggle, type ViewMode } from '@kbn/content-list-grid';
import { ContentListTable } from '@kbn/content-list-table';
```

---

## Expandable Row Details

The `ContentListTable` supports expandable rows for displaying additional content.

### Simple Inline

```tsx
<ContentListTable
  renderDetails={(item) => (
    <EuiText size="s">{item.additionalInfo}</EuiText>
  )}
/>
```

### Dashboard with Error Details

```tsx
const renderDashboardError = (item) => {
  if (!item.error) return null;
  
  return (
    <EuiCallOut title="Dashboard Load Error" color="danger" iconType="error">
      <p>{item.error.message}</p>
      <EuiButton size="s" onClick={() => retryLoad(item.id)}>
        Retry Loading
      </EuiButton>
    </EuiCallOut>
  );
};

<ContentListTable renderDetails={renderDashboardError} />
```

### Conditional Expansion

```tsx
<ContentListTable
  renderDetails={(item) => {
    // Only expand rows that have warnings
    if (!item.warnings?.length) return null;
    
    return (
      <EuiCallOut title="Warnings" color="warning" iconType="warning">
        <ul>
          {item.warnings.map((warning, idx) => (
            <li key={idx}>{warning}</li>
          ))}
        </ul>
      </EuiCallOut>
    );
  }}
/>
```

---

## Related Documents

- **[CLIENT_VS_SERVER.md](./CLIENT_VS_SERVER.md)** - When to use Client vs Server providers.
- **[LISTING_PROVIDER.md](./LISTING_PROVIDER.md)** - Provider implementation details.
- **[LISTING_COMPONENT.md](./LISTING_COMPONENT.md)** - Component specifications.
- **[PLAN.md](./PLAN.md)** - Implementation plan.
- **[proposals/PROPOSAL_CONTENT_LIST_PAGE.md](./proposals/PROPOSAL_CONTENT_LIST_PAGE.md)** - Architecture and rationale.
