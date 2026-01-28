# @kbn/content-list-provider

React context for managing content list state, enabling child components to focus on rendering while the provider handles data fetching, search, filtering, sorting, pagination, and selection.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Usage](#usage)
  - [Kibana Applications](#kibana-applications)
  - [Jest and Storybook](#jest-and-storybook)
- [Architecture](#architecture)
  - [Overview](#overview-1)
  - [Configuration Context](#configuration-context)
    - [Required Configuration](#required-configuration)
    - [Data Source Configuration](#data-source-configuration)
    - [Feature Configuration](#feature-configuration)
    - [Integration Configuration](#integration-configuration)
    - [Item Configuration](#item-configuration)
    - [Selection Actions (Bulk Operations)](#selection-actions-bulk-operations)
    - [Global Actions](#global-actions)
    - [Other Configuration](#other-configuration)
  - [State Context](#state-context)
    - [State Structure](#state-structure)
    - [Automatic Behaviors](#automatic-behaviors)
- [API](#api)
  - [Hooks](#hooks)
- [References](#references)

## Overview

This package provides a React context that encapsulates data fetching and state management for content items. Child components (tables, grids, toolbars) consume this context via hooks to render items and respond to user interactions without managing the underlying state themselves.

The package exports:

- **`ContentListProvider`** — Base provider that accepts explicit service implementations. Works in any environment (Kibana apps, Jest tests, Storybook, etc.). Requires a `dataSource.findItems` function.

For Kibana saved objects, use Kibana-specific providers from separate packages:
- **`ContentListServerKibanaProvider`** from `@kbn/content-list-provider-server` — For server-side data fetching
- **`ContentListClientKibanaProvider`** from `@kbn/content-list-provider-client` — For client-side data fetching

These Kibana providers wrap `ContentListProvider` and provide built-in data fetching strategies for Saved Objects.

## Quick Start

Provide a `findItems` function that handles data fetching with server-side filtering, sorting, and pagination:

```tsx
import { 
  ContentListProvider, 
  useContentListItems,
  useContentListSearch,
  type FindItemsFn,
} from '@kbn/content-list-provider';

// 1. Define your findItems function
const findItems: FindItemsFn = async ({ searchQuery, filters, sort, page, signal }) => {
  // Route through favorites endpoint when starredOnly is enabled.
  if (filters.starredOnly) {
    return favoritesClient.search({
      savedObjectType: 'dashboard',
      search: searchQuery,
      sortField: sort.field,
      sortOrder: sort.direction,
      page: page.index + 1,
      perPage: page.size,
    });
  }

  // Direct Saved Objects call otherwise.
  const response = await savedObjectsClient.find({
    type: 'dashboard',
    search: searchQuery ? `${searchQuery}*` : undefined,
    searchFields: ['title'],
    sortField: sort.field,
    sortOrder: sort.direction,
    page: page.index + 1,
    perPage: page.size,
  });

  return {
    items: response.savedObjects.map(so => so.attributes),
    total: response.total,
  };
};

// 2. Wrap your app with the provider
const DashboardListPage = () => (
  <ContentListProvider
    entityName="dashboard"
    entityNamePlural="dashboards"
    dataSource={{ findItems }}
    services={{
      core: coreStart,
      savedObjectsTagging: { ui: savedObjectsTagging.ui },
      favorites: favoritesService,
    }}
  >
    <DashboardList />
  </ContentListProvider>
);

// 3. Consume state via hooks
const DashboardList = () => {
  const { items, isLoading } = useContentListItems();
  const { queryText, setSearch } = useContentListSearch();

  if (isLoading) return <EuiLoadingSpinner />;

  return (
    <>
      <EuiFieldSearch value={queryText} onChange={(e) => setSearch(e.target.value)} />
      <EuiBasicTable items={items} columns={[{ field: 'title', name: 'Title' }]} />
    </>
  );
};
```

If your content items don't match the standard `UserContentCommonSchema` format, supply a `transform` function to convert them to `ContentListItem`:

```tsx
dataSource={{
  findItems,
  transform: (item) => ({
    id: item.uuid,
    title: item.name,
    description: item.summary,
    updatedAt: new Date(item.modified),
  }),
}}
```

> **Note:** For Kibana saved objects, consider using `ContentListServerKibanaProvider` from `@kbn/content-list-provider-server` or `ContentListClientKibanaProvider` from `@kbn/content-list-provider-client` which provide built-in data fetching strategies. See [Jest and Storybook](#jest-and-storybook) for testing patterns.


## Usage

### Kibana Applications

For typical Kibana usage, wrap your content list components with `ContentListProvider`:

```tsx
import { ContentListProvider, type FindItemsFn } from '@kbn/content-list-provider';

const DashboardListPage = () => {
  const { savedObjectsTagging, core, favorites, savedObjectsClient, favoritesClient } = useServices();
  const savedObjectsTaggingApi = savedObjectsTagging?.getTaggingApi();

  // Define findItems with server-side operations.
  const findItems: FindItemsFn = async ({ searchQuery, filters, sort, page, signal }) => {
    // Handle favorites filtering via the favorites search endpoint.
    if (filters.starredOnly) {
      return favoritesClient.search({
        savedObjectType: 'dashboard',
        search: searchQuery,
        sortField: sort.field,
        sortOrder: sort.direction,
        page: page.index + 1,
        perPage: page.size,
      });
    }

    // Standard saved objects query.
    const response = await savedObjectsClient.find({
      type: 'dashboard',
      search: searchQuery ? `${searchQuery}*` : undefined,
      searchFields: ['title'],
      sortField: sort.field,
      sortOrder: sort.direction,
      page: page.index + 1,
      perPage: page.size,
    });

    return {
      items: response.savedObjects.map(so => so.attributes),
      total: response.total,
    };
  };

  return (
    <ContentListProvider
      entityName="dashboard"
      entityNamePlural="dashboards"
      dataSource={{ findItems }}
      services={{
        core: coreStart,
        savedObjectsTagging: { ui: savedObjectsTaggingApi.ui },
        favorites: favoritesService,
      }}
      // tags, userProfiles, and starred are automatically enabled
      // since the corresponding services are provided
    >
      <ContentListToolbar />
      <ContentListTable />
      <ContentListFooter />
    </ContentListProvider>
  );
};
```

**Feature defaults:**
- Service-dependent features (`starred`, `tags`, `userProfiles`) are automatically enabled when their service is provided.
- Self-contained features (`search`, `filtering`, `sorting`, `pagination`) default to `true`.
- Pass a configuration object in `features` to customize, or set any feature to `false` to disable it.

See [Configuration Context](#configuration-context) for details.

### Jest and Storybook

For tests and stories, use `ContentListProvider` with mock services:

```tsx
import { ContentListProvider } from '@kbn/content-list-provider';

const mockServices = {
  tags: {
    getTagList: () => [{ id: 'tag-1', name: 'Important', color: '#ff0000' }],
  },
  favorites: mockFavoritesService,
};

const wrapper = ({ children }) => (
  <ContentListProvider
    entityName="dashboard"
    entityNamePlural="dashboards"
    dataSource={{ findItems: mockFindItems }}
    services={mockServices}
    // tags and starred are automatically enabled since services are provided
  >
    {children}
  </ContentListProvider>
);
```

This pattern enables testing components in isolation without Kibana runtime dependencies.

## Architecture

### Overview

The package uses a two-layer provider pattern:

```
┌─────────────────────────────────────────────────────────────┐
│  ContentListKibanaProvider (adapts Kibana services)         │
│  ─── or ───                                                 │
│  ContentListProvider (accepts explicit services)            │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Configuration Context (static)                       │  │
│  │  - Entity names, data source, feature configs         │  │
│  │  - Accessed via useContentListConfig()              │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  State Context (dynamic)                        │  │  │
│  │  │  - Items, loading, search, filters, pagination  │  │  │
│  │  │  - Managed by reducer + React Query             │  │  │
│  │  │  - Accessed via feature hooks                   │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Kibana vs Non-Kibana Context:**

- `ContentListProvider` accepts a `services` prop with explicit implementations. For Kibana apps, pass `core`, `savedObjectsTagging`, and `favorites` services.
- For Kibana saved objects, consider using `ContentListServerKibanaProvider` from `@kbn/content-list-provider-server` or `ContentListClientKibanaProvider` from `@kbn/content-list-provider-client` which provide built-in data fetching strategies.

### Configuration Context

The configuration context holds static values that define the content list behavior. Access it via `useContentListConfig()`.

#### Required Configuration

| Prop | Type | Description |
|------|------|-------------|
| `entityName` | `string` | Singular name (e.g., `"dashboard"`). |
| `entityNamePlural` | `string` | Plural name (e.g., `"dashboards"`). |
| `dataSource` | `DataSourceConfig` | Data fetching configuration (see below). |

#### Data Source Configuration

The `dataSource` prop requires a `findItems` function that handles data fetching with server-side filtering, sorting, and pagination:

```tsx
dataSource={{
  findItems: async ({ searchQuery, filters, sort, page, signal }) => {
    // Handle starredOnly filter via favorites search endpoint.
    if (filters.starredOnly) {
      return favoritesClient.search({
        savedObjectType: 'dashboard',
        search: searchQuery,
        sortField: sort.field,
        sortOrder: sort.direction,
        page: page.index + 1,
        perPage: page.size,
      });
    }

    // Standard saved objects query for non-favorites.
    const response = await savedObjectsClient.find({
      type: 'dashboard',
      search: searchQuery ? `${searchQuery}*` : undefined,
      searchFields: ['title'],
      sortField: sort.field,
      sortOrder: sort.direction,
      page: page.index + 1,
      perPage: page.size,
      // Map tag filters to hasReference.
      hasReference: filters.tags?.include?.map(id => ({ type: 'tag', id })),
      // Map createdBy filter.
      filter: filters.users?.length ? `dashboard.attributes.createdBy:(${filters.users.join(' OR ')})` : undefined,
    });

    return {
      items: response.savedObjects.map(so => so.attributes),
      total: response.total,
    };
  },
  transform: (item) => ({  // Required for custom types
    id: item.uuid,
    title: item.name,
    updatedAt: new Date(item.modified),
  }),
}}
```

**`FindItemsParams` received by `findItems`:**

| Property | Type | Description |
|----------|------|-------------|
| `searchQuery` | `string` | Text search query. |
| `filters` | `ActiveFilters` | Active filters including `tags`, `users`, `starredOnly`, and custom filters. |
| `sort` | `{ field: string; direction: 'asc' \| 'desc' }` | Sort configuration. |
| `page` | `{ index: number; size: number }` | Pagination (zero-based index). |
| `signal` | `AbortSignal?` | Signal for request cancellation. |

| Property | Description |
|----------|-------------|
| `findItems` | Async function that fetches items. Receives search, filter, sort, and pagination parameters. |
| `transform` | Converts raw items to `ContentListItem` format. **Optional** for `UserContentCommonSchema`; **required** otherwise. |
| `onFetchSuccess` | Optional callback after successful fetch. |

#### Feature Configuration

Features are configured via the `features` prop. Each feature can be:

- **`true`** (or omitted) — Enabled with defaults.
- **`false`** — Disabled.
- **Configuration object** — Enabled with custom settings.

| Feature | Default | Configuration Type |
|---------|---------|-------------------|
| `features.search` | `true` | `SearchConfig` |
| `features.filtering` | `true` | `FilteringConfig` |
| `features.sorting` | `true` | `SortingConfig` |
| `features.pagination` | `true` | `PaginationConfig` |

**Default behavior when enabled:**

- **Search**: Empty initial query, 300ms debounce.
- **Filtering**: No filters configured (enable specific filters via config).
- **Sorting**: Sort by `title` ascending. Default sortable fields: `title`, `updatedAt`.
- **Pagination**: 20 items per page.

**Example with customization:**

```tsx
<ContentListProvider
  entityName="dashboard"
  entityNamePlural="dashboards"
  dataSource={{ findItems }}
  services={{
    core: core,
    savedObjectsTagging: { ui: savedObjectsTagging.ui },
  }}
  features={{
    search: { placeholder: 'Search dashboards...', debounceMs: 500 },
    sorting: {
      fields: [...DEFAULT_SORT_FIELDS, { field: 'status', name: 'Status' }],
      initialSort: { field: 'updatedAt', direction: 'desc' },
    },
    pagination: { initialPageSize: 50, pageSizeOptions: [25, 50, 100] },
    filtering: { tags: true, users: true, favorites: true },
  }}
/>
```

#### Integration Configuration

Service-dependent features are **automatically enabled** when the corresponding service is provided:

| Feature | Service Required | Description |
|---------|------------------|-------------|
| `tags` | `tags` (from `savedObjectsTagging`) | Tag filtering and display. |
| `userProfiles` | `userProfile` (from `core.userProfile`) | User profile filtering. |
| `starred` | `favorites` service | Starred items functionality. |

```tsx
// Simple: services provided = features enabled
<ContentListProvider
  dataSource={{ findItems }}
  services={{
    core: coreStart,
    savedObjectsTagging: { ui: taggingService.ui },
    favorites: favoritesService,
  }}
  // tags, userProfiles, and starred automatically enabled
  // ...
/>

// Explicit disable: set feature to false
<ContentListProvider
  dataSource={{ findItems }}
  services={{
    core: coreStart,
    savedObjectsTagging: { ui: taggingService.ui },
  }}
  features={{ userProfiles: false }}      // explicitly disable despite core.userProfile
  // ...
/>
```

#### Item Configuration

The `item` prop configures per-item behavior including navigation and actions.

**Link generation:**

```tsx
item={{
  getHref: (item) => `/app/dashboard/${item.id}`,
}}
```

When `getHref` is provided, item titles become clickable links.

**Built-in item actions:**

| Action | Icon | Description |
|--------|------|-------------|
| `onClick` | — | Primary click handler (row or title click). |
| `onEdit` | Pencil | Opens item for editing. |
| `onViewDetails` | Controls | Shows item details/settings. |
| `onDuplicate` | Copy | Creates a copy of the item. |
| `onExport` | Export | Exports the item. |
| `onDelete` | Trash (danger) | Deletes the item with confirmation. |

```tsx
item={{
  actions: {
    onClick: (item) => navigateTo(item.id),
    onEdit: (item) => openEditor(item),
    onDelete: (item) => confirmDelete(item),
  },
}}
```

**Conditional action enabling:**

Built-in actions support an `isEnabled` function to conditionally disable actions for specific items:

```tsx
item={{
  actions: {
    onEdit: {
      handler: (item) => openEditor(item.id),
      isEnabled: (item) => !item.isManaged,  // Disable for managed items
    },
    onDelete: {
      handler: (item) => confirmDelete(item),
      isEnabled: (item) => canDelete(item),
    },
  },
}}
```

**Custom item actions:**

Add custom actions via the `custom` array. Each action requires an `id`, `iconType`, `label`, and `handler`:

```tsx
item={{
  actions: {
    onEdit: (item) => openEditor(item),
    custom: [
      {
        id: 'share',
        iconType: 'share',
        label: 'Share',
        tooltip: 'Share this dashboard',
        handler: (item) => openShareModal(item),
      },
      {
        id: 'clone-to-space',
        iconType: 'spaces',
        label: 'Clone to space',
        handler: (item) => cloneToSpace(item),
        color: 'primary',
      },
    ],
  },
}}
```

Custom action options:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | ✓ | Unique identifier. |
| `iconType` | `string` | ✓ | EUI icon name. |
| `label` | `string` | ✓ | Display label. |
| `handler` | `(item) => void` | ✓ | Click handler. |
| `tooltip` | `string` | | Tooltip text. |
| `isEnabled` | `(item) => boolean` | | Function to conditionally enable/disable the action. |
| `color` | `string` | | Button color (`primary`, `danger`, etc.). |
| `data-test-subj` | `string` | | Test selector. |

#### Selection Actions (Bulk Operations)

Configure bulk actions on selected items via `features.selection`. Selection UI is only rendered when at least one selection action is defined.

**Built-in selection actions:**

| Action | Description |
|--------|-------------|
| `onSelectionDelete` | Bulk delete selected items. |
| `onSelectionExport` | Bulk export selected items. |

```tsx
features={{
  selection: {
    onSelectionDelete: (items) => {
      const ids = items.map((item) => item.id);
      await bulkDelete(ids);
    },
    onSelectionExport: (items) => {
      downloadAsJson(items);
    },
  },
}}
```

**Custom selection actions:**

Add any custom bulk action by adding a handler with a custom key:

```tsx
features={{
  selection: {
    onSelectionDelete: (items) => bulkDelete(items),
    onSelectionTag: (items) => openBulkTagModal(items),      // Custom
    onSelectionMove: (items) => openMoveToSpaceModal(items), // Custom
  },
}}
```

**Accessing selection state:**

Use `useContentListSelection()` to manage selection in your components:

```tsx
const {
  selectedItems,      // Set<string> of selected IDs
  selectedCount,      // Number of selected items
  isSelected,         // (id: string) => boolean
  toggleSelection,    // (id: string) => void
  setSelection,       // (ids: Set<string>) => void
  clearSelection,     // () => void
  selectAll,          // () => void
  getSelectedItems,   // () => ContentListItem[]
} = useContentListSelection();
```

#### Global Actions

Configure list-level actions via `features.globalActions`:

```tsx
features={{
  globalActions: {
    onCreate: () => navigateTo('/app/dashboard/create'),
  },
}}
```

| Action | Description |
|--------|-------------|
| `onCreate` | Handler for creating a new item. Renders a "Create" button. |

#### Other Configuration

| Prop | Type | Description |
|------|------|-------------|
| `isReadOnly` | `boolean` | Disables selection and item actions (search, filter, sort still work). |

### State Context

The state context manages runtime data using a reducer pattern with React Query for data fetching. Access it via feature-specific hooks.

#### State Structure

```typescript
interface ContentListState {
  items: ContentListItem[];       // Current page of items (transformed)
  totalItems: number;             // Total matching items (for pagination)
  isLoading: boolean;             // Fetch in progress
  error?: Error;                  // Most recent error

  search: {
    queryText: string;            // Raw search input including filter syntax
    error?: Error;
  };

  filters: ActiveFilters;         // Parsed filter state
  sort: { field: string; direction: 'asc' | 'desc' };
  page: { index: number; size: number };

  selectedItems: Set<string>;     // Selected item IDs
  isReadOnly: boolean;
}
```

#### Automatic Behaviors

- **Page reset**: Changing search, filters, or sort resets pagination to page 0.
- **Request cancellation**: Stale requests are cancelled when parameters change.
- **Caching**: React Query caches results; changing parameters triggers refetch.
- **Read-only enforcement**: Selection actions are no-ops when `isReadOnly` is `true`.

## API

### Hooks

#### Configuration

| Hook | Returns | Purpose |
|------|---------|---------|
| `useContentListConfig()` | Full config + `supports` flags | Access configuration and check feature support. |

#### State

| Hook | Returns | Purpose |
|------|---------|---------|
| `useContentListItems()` | `{ items, totalItems, isLoading, error, refetch }` | Access loaded items and loading state. |
| `useContentListSearch()` | `{ queryText, error, setSearch, clearSearch }` | Read/update search query. |
| `useContentListFilters()` | `{ filters, setFilters, clearFilters }` | Read/update active filters. |
| `useQueryFilter(field, options)` | `QueryFilterState & QueryFilterActions` | Manage query-based filters for a specific field. |
| `useFilterDisplay()` | `FilterDisplayState` | Determine which filter UI elements should be rendered. |
| `useContentListSort()` | `{ field, direction, setSort }` | Read/update sort configuration. |
| `useContentListPagination()` | `{ index, size, totalPages, setPage }` | Read/update pagination. |
| `useContentListSelection()` | Selection state and actions | Manage item selection. See [Selection Actions](#selection-actions-bulk-operations). |
| `useSortableFields()` | `string[]` | Get list of sortable field names from config. |

## References

- **[MIGRATIONS](./MIGRATIONS.md)** — Migration guide from TableListView to ContentListProvider.
