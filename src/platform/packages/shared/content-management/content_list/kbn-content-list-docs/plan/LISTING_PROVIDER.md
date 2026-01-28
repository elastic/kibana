# ContentListProvider Implementation Guide

## Document Purpose

This document provides implementation guidance for the `ContentListProvider` and its related state management system. This is the foundational piece that manages all shared state and provides context to UI components.

**Related Documents:**
- **[PLAN.md](./PLAN.md)** - Overall implementation plan
- **[proposals/PROPOSAL_CONTENT_LIST_PAGE.md](./proposals/PROPOSAL_CONTENT_LIST_PAGE.md)** - Architecture rationale
- **[CLIENT_VS_SERVER.md](./CLIENT_VS_SERVER.md)** - When to use Client vs Server providers

> **API Documentation:** For current API details, see [`kbn-content-list-provider/README.md`](../../kbn-content-list-provider/README.md).

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Provider Components](#provider-components)
3. [Configuration](#configuration)
4. [State Management](#state-management)
5. [Feature Hooks](#feature-hooks)
6. [Filter Syntax](#filter-syntax)
7. [Transform Functions](#transform-functions)
8. [Testing Strategy](#testing-strategy)

---

## Architecture Overview

The provider uses a three-provider architecture with two Kibana-specific providers:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ContentListClientKibanaProvider    ContentListServerKibanaProvider     │
│  (wraps existing TableListView      (uses /list endpoint with           │
│   findItems with client-side         server-side processing)            │
│   processing and caching)                                               │
│                     ─── or ───                                          │
│              ContentListProvider (for tests/Storybook/bespoke)          │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Configuration Context (static)                                   │  │
│  │  - Entity names, data source, feature configs                     │  │
│  │  - Accessed via useContentListConfig()                            │  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │  State Context (dynamic)                                    │  │  │
│  │  │  - Items, loading, search, filters, pagination              │  │  │
│  │  │  - Managed by reducer + React Query                         │  │  │
│  │  │  - Accessed via feature hooks                               │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Transform-Based Architecture** - Generic `<T>` only at datasource boundary; all UI works with standardized `ContentListItem`.
2. **Service Auto-Detection** - Tags, starred, user profiles enabled when services are provided.
3. **Feature Configuration** - `features` prop groups all feature settings.
4. **Feature-Specific Hooks** - Separate hooks for each concern (search, filters, sort, etc.).
5. **Read-Only Mode** - Disables selection and actions when `isReadOnly={true}`.
6. **React Query Integration** - Caching, automatic refetch, request cancellation.
7. **Client-Side Caching** - Client provider caches results to avoid re-fetches on sort/page changes.

### Package Structure

```
@kbn/content-list-provider/           # Base provider and hooks
├── src/
│   ├── context/                      # Provider components
│   ├── datasource/                   # Data source types and default transform
│   ├── features/                     # Feature-specific types and hooks
│   │   ├── content_editor/
│   │   ├── filtering/
│   │   ├── pagination/
│   │   ├── search/
│   │   ├── selection/
│   │   └── sorting/
│   ├── item/                         # Item configuration types
│   ├── query/                        # Query parsing and React Query hooks
│   └── state/                        # State reducer and provider

@kbn/content-list-provider-client/    # Client-side Kibana provider
├── provider.tsx                      # ContentListClientKibanaProvider
└── strategy.ts                       # createFindItemsAdapter

@kbn/content-list-provider-server/    # Server-side Kibana provider
├── provider.tsx                      # ContentListServerKibanaProvider
└── strategy.ts                       # createSearchItemsStrategy
```

---

## Provider Components

### ContentListClientKibanaProvider

For **migrating existing `TableListView` consumers**. Wraps your existing `findItems` function with client-side processing (sorting, pagination, filtering). Use this when you already have a working `findItems` implementation.

**Key features:**
- Accepts the same `findItems` signature as `TableListView`.
- Performs client-side sorting and pagination (no server re-fetch).
- Caches results to avoid unnecessary API calls.
- Resolves usernames/emails to UIDs for `createdBy` filtering.
- Supports `is:starred` filtering via favorites service.

```tsx
import { ContentListClientKibanaProvider } from '@kbn/content-list-provider-client';

// Your existing findItems function from TableListView.
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
    sorting: { initialSort: { field: 'updatedAt', direction: 'desc' } },
  }}
  item={{
    getHref: (item) => `/app/dashboard/${item.id}`,
    actions: { onEdit: editDashboard },
  }}
>
  {children}
</ContentListClientKibanaProvider>
```

### ContentListServerKibanaProvider

For **new implementations** that want server-side processing. Uses the `/internal/content_management/list` endpoint which provides:
- Server-side sorting and pagination.
- Server-side tag and user filtering.
- User profile enrichment (avatars, names).
- Support for custom sort fields via runtime mappings.

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
  features={{
    search: { placeholder: 'Search maps...' },
    sorting: { initialSort: { field: 'updatedAt', direction: 'desc' } },
  }}
  item={{
    getHref: (item) => `/app/maps/${item.id}`,
    actions: { onEdit: editMap },
  }}
>
  {children}
</ContentListServerKibanaProvider>
```

### ContentListProvider

For **tests, Storybook, and bespoke implementations**. Accepts explicit services and a `findItems` function.

```tsx
import { ContentListProvider } from '@kbn/content-list-provider';

<ContentListProvider
  entityName="dashboard"
  entityNamePlural="dashboards"
  dataSource={{ findItems: mockFindItems }}
  services={{
    tags: { getTagList: () => mockTags },
    favorites: mockFavoritesService,
  }}
>
  {children}
</ContentListProvider>
```

---

## Configuration

### Core Configuration

| Prop | Type | Description |
|------|------|-------------|
| `entityName` | `string` | Singular name (e.g., `"dashboard"`). |
| `entityNamePlural` | `string` | Plural name (e.g., `"dashboards"`). |
| `dataSource` | `DataSourceConfig` | Data fetching configuration (base provider only). |
| `isReadOnly` | `boolean` | Disables selection and item actions. |
| `queryKeyScope` | `string` | Unique scope for React Query cache keys. |

### Data Source Configuration

The `findItems` function receives filter parameters and returns items:

```tsx
// FindItemsFn signature (used by base ContentListProvider).
type FindItemsFn<T> = (params: FindItemsParams) => Promise<FindItemsResult<T>>;

interface FindItemsParams {
  searchQuery: string;
  filters: {
    tags?: { include?: string[]; exclude?: string[] };
    users?: string[];           // User IDs or usernames.
    starredOnly?: boolean;      // Filter to starred items only.
    [key: string]: unknown;     // Custom filters.
  };
  sort: { field: string; direction: 'asc' | 'desc' };
  page: { index: number; size: number };
  signal?: AbortSignal;
}

interface FindItemsResult<T> {
  items: T[];
  total: number;
  resolvedFilters?: {           // For client deduplication.
    createdBy?: Record<string, string>;
  };
}
```

**Client Provider:** Uses `TableListViewFindItemsFn` (same as existing `TableListView`):

```tsx
// Your existing findItems - no changes needed.
const findItems = async (searchQuery, refs) => {
  return dashboardClient.search({ search: searchQuery, ...refs });
};

<ContentListClientKibanaProvider
  findItems={findItems}
  transform={dashboardTransform}
  // ... other props
/>
```

**Server Provider:** Configured via `savedObjectType`, internally uses `/list` endpoint:

```tsx
<ContentListServerKibanaProvider
  savedObjectType="dashboard"
  // ... other props
/>
```

### Feature Configuration

Features are configured via the `features` prop:

```tsx
features={{
  search: { placeholder: 'Search dashboards...' },
  sorting: {
    fields: [...DEFAULT_SORT_FIELDS, { field: 'status', name: 'Status' }],
    initialSort: { field: 'updatedAt', direction: 'desc' },
  },
  pagination: { initialPageSize: 50 },
  selection: {
    onSelectionDelete: (items) => bulkDelete(items),
  },
  globalActions: {
    onCreate: () => navigateTo('/create'),
  },
  contentEditor: {
    onSave: async (args) => updateItemMeta(args),
  },
  favorites: true,  // Enable starred/favorites feature.
  tags: true,       // Enable tags feature.
}}
```

### Service Configuration

Service-dependent features are auto-enabled when services are provided:

| Feature | Service Required | `supports` Flag |
|---------|------------------|-----------------|
| Tags | `savedObjectsTagging` | `supports.tags` |
| User Profiles | `core.userProfile` | `supports.userProfiles` |
| Starred | `favorites` service | `supports.starred` |

> **Note:** The service layer uses "favorites" terminology (`FavoritesClient`, `favoritesOnly`), while the provider and UI use "starred" terminology (`starredOnly`, `is:starred`, `supports.starred`).

### Item Configuration

```tsx
item={{
  getHref: (item) => `/app/dashboard/${item.id}`,
  actions: {
    onClick: (item) => navigateTo(item.id),
    onEdit: (item) => openEditor(item),
    onViewDetails: (item) => openDetails(item),
    onDuplicate: (item) => duplicateItem(item),
    onDelete: (item) => confirmDelete(item),
    custom: [
      {
        id: 'share',
        iconType: 'share',
        label: 'Share',
        handler: (item) => openShareModal(item),
      },
    ],
  },
}}
```

---

## State Management

### State Structure

```typescript
interface ContentListState {
  items: ContentListItem[];
  totalItems: number;
  isLoading: boolean;
  error?: Error;

  search: {
    queryText: string;
    error?: Error;
  };

  filters: ActiveFilters;
  sort: { field: string; direction: 'asc' | 'desc' };
  page: { index: number; size: number };

  selectedItems: Set<string>;
  isReadOnly: boolean;
}
```

### Automatic Behaviors

- **Page reset** - Changing search, filters, or sort resets to page 0.
- **Request cancellation** - Stale requests are cancelled.
- **Caching** - React Query caches results.
- **Read-only enforcement** - Selection actions are no-ops when read-only.

---

## Feature Hooks

### Configuration Hook

```tsx
const { entityName, item, features, supports } = useContentListConfig();
```

### State Hooks

| Hook | Returns | Purpose |
|------|---------|---------|
| `useContentListItems()` | `{ items, totalItems, isLoading, error, refetch }` | Access loaded items. |
| `useContentListSearch()` | `{ queryText, error, setSearch, clearSearch }` | Search query. |
| `useContentListFilters()` | `{ filters, setFilters, clearFilters }` | Active filters. |
| `useContentListSort()` | `{ field, direction, setSort }` | Sort configuration. |
| `useContentListPagination()` | `{ index, size, totalPages, setPage }` | Pagination. |
| `useContentListSelection()` | Selection state and actions | Item selection. |
| `useQueryFilter(field, options)` | Filter state for a specific field | Query-based filter. |
| `useFilterDisplay()` | `FilterDisplayState` | Which filters to render. |
| `useSortableFields()` | `string[]` | Available sort fields. |

### Usage Examples

```tsx
function MyList() {
  const { items, isLoading } = useContentListItems();
  const { queryText, setSearch } = useContentListSearch();
  const { selectedItems, toggleSelection, clearSelection } = useContentListSelection();

  if (isLoading) return <EuiLoadingSpinner />;

  return (
    <>
      <EuiFieldSearch
        value={queryText}
        onChange={(e) => setSearch(e.target.value)}
      />
      <EuiBasicTable
        items={items}
        selection={{
          selected: items.filter(i => selectedItems.has(i.id)),
          onSelectionChange: (selected) => {
            clearSelection();
            selected.forEach(item => toggleSelection(item.id));
          },
        }}
      />
    </>
  );
}
```

---

## Filter Syntax

The search bar supports query syntax for filtering. These are parsed and applied to the `filters` object.

### Supported Query Clauses

| Syntax | Description | Example |
|--------|-------------|---------|
| `is:starred` | Filter to starred items only | `is:starred dashboard` |
| `tag:(name)` | Include items with tag | `tag:production` |
| `-tag:(name)` | Exclude items with tag | `-tag:draft` |
| `createdBy:(value)` | Filter by creator | `createdBy:elastic` |
| `createdBy:(no-user)` | Items without a creator | `createdBy:(no-user)` |

### Filter Resolution

**Client Provider:**
- Tags are resolved to IDs and passed to the consumer's `findItems`.
- User filters are resolved to UIDs using cached user profiles (only "known" users work).
- Starred filter fetches favorite IDs and filters client-side.

**Server Provider:**
- All filters are sent to the `/list` endpoint.
- User filters are resolved server-side (usernames, emails, UIDs all work).
- `no-user` filter generates `must_not exists: created_by` ES query.

### ActiveFilters Interface

```typescript
interface ActiveFilters {
  search?: string;
  tags?: {
    include?: string[];
    exclude?: string[];
  };
  users?: string[];
  starredOnly?: boolean;
  [key: string]: unknown;  // Custom filters.
}
```

---

## Transform Functions

### Default Transform

For types extending `UserContentCommonSchema`, the default transform is used:

```typescript
const defaultTransform = (item: UserContentCommonSchema): ContentListItem => ({
  id: item.id,
  title: item.attributes.title,
  description: item.attributes.description,
  type: item.type,
  updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
  createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
  updatedBy: item.updatedBy,
  createdBy: item.createdBy,
  tags: extractTags(item.references),
});
```

### Custom Transform

For custom types, provide a transform function:

```typescript
interface CustomApiItem {
  uuid: string;
  name: string;
  lastModified: number;
}

const customTransform: TransformFunction<CustomApiItem> = (item) => ({
  id: item.uuid,
  title: item.name,
  updatedAt: new Date(item.lastModified),
});

<ContentListProvider<CustomApiItem>
  dataSource={{
    findItems: fetchCustomItems,
    transform: customTransform,
  }}
/>
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

## Testing Strategy

### Unit Tests

**Provider Tests:**
- Context creation and value structure.
- Read-only mode disables actions.
- Memoization prevents unnecessary re-renders.
- Service integration.

**Reducer Tests:**
- Each action type updates state correctly.
- Page resets on search/filter/sort changes.
- Selection operations.
- Immutability of state updates.

**Hook Tests:**
- Error when used outside provider.
- Correct action dispatching.
- Callback memoization.

### Integration Tests

```tsx
describe('ContentListProvider Integration', () => {
  it('fetches and displays items', async () => {
    const mockFindItems = jest.fn().mockResolvedValue({
      items: [{ id: '1', attributes: { title: 'Test' } }],
      total: 1,
    });

    function TestComponent() {
      const { items } = useContentListItems();
      return <div>{items.length} items</div>;
    }

    render(
      <ContentListProvider
        entityName="dashboard"
        entityNamePlural="dashboards"
        dataSource={{ findItems: mockFindItems }}
      >
        <TestComponent />
      </ContentListProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('1 items')).toBeInTheDocument();
    });
  });
});
```

### Test Utilities

```tsx
import { ContentListProvider } from '@kbn/content-list-provider';

export function renderWithProvider(ui: React.ReactElement, options = {}) {
  const mockFindItems = jest.fn().mockResolvedValue({ total: 0, items: [] });

  return render(
    <ContentListProvider
      entityName="test"
      entityNamePlural="tests"
      dataSource={{ findItems: mockFindItems }}
      {...options}
    >
      {ui}
    </ContentListProvider>
  );
}
```

---

## See Also

- [`kbn-content-list-provider/README.md`](../../kbn-content-list-provider/README.md) - Full API documentation.
- [`kbn-content-list-provider/RECIPES.mdx`](../../kbn-content-list-provider/RECIPES.mdx) - Usage examples.
