# @kbn/content-list-provider

React context for managing content list state, enabling child components to focus on rendering while the provider handles data fetching, caching, and state management.

## Overview

This package provides a React context that encapsulates data fetching and state management for content items. Child components (tables, grids, toolbars) consume this context via hooks to render items and respond to user interactions without managing the underlying state themselves.

The package exports:

- **`ContentListProvider`** — Base provider that accepts a datasource configuration. Works in any environment (Kibana apps, Jest tests, Storybook, etc.).

## Quick Start

```tsx
import { ContentListProvider, useContentListItems, type FindItemsFn } from '@kbn/content-list-provider';

// 1. Define your findItems function.
const findItems: FindItemsFn = async ({ searchQuery, filters, sort, page, signal }) => {
  const response = await myApi.search({
    query: searchQuery,
    sortField: sort.field,
    sortOrder: sort.direction,
    page: page.index,
    pageSize: page.size,
    signal,
  });

  return {
    items: response.items,
    total: response.total,
  };
};

// 2. Wrap your app with the provider.
const DashboardListPage = () => (
  <ContentListProvider
    id="dashboard"
    labels={{
      entity: i18n.translate('dashboard.listing.entity', { defaultMessage: 'dashboard' }),
      entityPlural: i18n.translate('dashboard.listing.entityPlural', { defaultMessage: 'dashboards' }),
    }}
    dataSource={{ findItems }}
  >
    <DashboardList />
  </ContentListProvider>
);

// 3. Consume state via hooks.
const DashboardList = () => {
  const { items, isLoading } = useContentListItems();

  if (isLoading) return <EuiLoadingSpinner />;

  return <EuiBasicTable items={items} columns={[{ field: 'title', name: 'Title' }]} />;
};
```

## Configuration

### Identity

At least one of `id` or `queryKeyScope` must be provided:

| Prop | Type | Description |
|------|------|-------------|
| `id` | `string` | Unique identifier for the content list instance. If `queryKeyScope` is not provided, it's derived as `${id}-listing`. |
| `queryKeyScope` | `string` | Explicit scope for React Query cache keys. Use when you need cache isolation separate from the semantic `id`. |

```tsx
// Using id only: queryKeyScope derived as "dashboard-listing".
<ContentListProvider id="dashboard" labels={...} dataSource={...} />

// Using queryKeyScope only.
<ContentListProvider queryKeyScope="my-dashboards" labels={...} dataSource={...} />

// Using both: queryKeyScope for caching, id for analytics/test selectors.
<ContentListProvider id="dashboard" queryKeyScope="dashboard-listing-v2" labels={...} dataSource={...} />
```

### Labels

User-facing labels for the content type. These should be i18n-translated strings.

```tsx
labels={{
  entity: i18n.translate('myPlugin.listing.entity', { defaultMessage: 'dashboard' }),
  entityPlural: i18n.translate('myPlugin.listing.entityPlural', { defaultMessage: 'dashboards' }),
}}
```

### Data Source

The `dataSource` prop configures how items are fetched:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `findItems` | `FindItemsFn` | Yes | Async function that fetches items (returns `{ items: ContentListItem[], total: number }`). |
| `onFetchSuccess` | `(result) => void` | No | Callback after successful fetch. |

#### findItems Parameters

```typescript
interface FindItemsParams {
  searchQuery: string;
  filters: ActiveFilters;
  sort?: { field: string; direction: 'asc' | 'desc' };
  page: { index: number; size: number };
  signal?: AbortSignal;
}
```

### Item Configuration

Configure per-item behavior via the `item` prop:

```tsx
item={{
  getHref: (item) => `/app/dashboard/${item.id}`,
}}
```

### Other Props

| Prop | Type | Description |
|------|------|-------------|
| `isReadOnly` | `boolean` | When `true`, disables selection and editing actions. |
| `features` | `ContentListFeatures` | Feature configuration for sorting and other capabilities. |

## Architecture

The package uses a two-layer provider pattern:

```
┌─────────────────────────────────────────────────────────────┐
│  ContentListProvider                                        │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Configuration Context (static)                       │  │
│  │  - Labels, data source, feature configs               │  │
│  │  - Accessed via useContentListConfig()                │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  State Context (dynamic)                        │  │  │
│  │  │  - Items, loading, sort                         │  │  │
│  │  │  - Managed by reducer + React Query             │  │  │
│  │  │  - Accessed via feature hooks                   │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Configuration Context

Holds static values that define content list behavior. Access via `useContentListConfig()`.

### State Context

Manages runtime data using a reducer pattern with React Query for data fetching. Access via feature-specific hooks.

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
| `useContentListSort()` | `{ field, direction, setSort, isSupported }` | Read/update sort configuration. |
| `useContentListSearch()` | `{ queryText, setQueryFromEuiQuery, isSupported, fieldNames }` | Read/update the search bar query text. |
| `useContentListPagination()` | `{ page, setPage, isSupported }` | Read/update pagination state. |
| `useContentListSelection()` | `{ selected, setSelected, isSupported }` | Read/update row selection state. |
| `useContentListFilters()` | `{ filters, clearFilters }` | Read derived `ActiveFilters` from `queryText` and clear all filters. |
| `useFilterToggle(fieldName)` | `(id: string, type?: 'include' \| 'exclude') => void` | Toggle a value in any field filter via EUI Query mutations. |
| `useTagFilterToggle()` | `(value: string) => void` | Convenience wrapper around `useFilterToggle` for the `tag` field. |
| `useCreatedByFilterToggle()` | `(value: string) => void` | Convenience wrapper around `useFilterToggle` for the `createdBy` field. |
| `useFilterFacets(filterId, opts?)` | `UseQueryResult<FilterFacet[]>` | Fetch display-ready `FilterFacet[]` for a filter popover (lazy, via React Query). Pass `{ enabled: isOpen }` to fire on popover open. |
| `useDeleteConfirmation(options)` | `{ showConfirmation, DeleteModal }` | Manage delete confirmation modal state. |
| `useProfileCache()` | `ProfileCache \| undefined` | Access the shared profile cache instance. Returns `undefined` when user profiles are not configured. |
| `useProfileCacheVersion()` | `number` | Subscribe to cache version changes. Re-renders only when profiles are loaded. |
| `useProfile(uid)` | `UserProfileEntry \| undefined` | Resolve a single profile by UID. Self-loading via batched requests. |

