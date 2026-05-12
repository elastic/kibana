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
| `debounceMs` | `number` | No | Milliseconds to debounce free-text search before firing a request. Defaults to `300`. Structured filter changes (tags, flags, sort, pagination) are always immediate. |
| `onFetchSuccess` | `(result) => void` | No | Callback after a successful fetch. Useful for priming local caches. |
| `onInvalidate` | `() => void` | No | Called by `refetch` before re-executing the query so any client-side cache can be cleared first. |

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
| `features` | `ContentListFeatures` | Opt-in feature configuration. Supports `urlSync` (enabled by default; pass `false` to opt out), `sorting` (field list + initial sort), `pagination` (initial page size), `tags` (tag facet provider), `starred` (favorites service required), and `userProfiles` (user profile facet provider). |
| `services` | `ContentListServices` | External service integrations. Supports `favorites` (for starred toggling), `tags` (for tag filter popovers), and `userProfiles` (for `createdBy` avatars and filter popovers). |

### URL Persistence

When `ContentListProvider` is rendered inside a React Router context, `queryText` and `sort` are synchronized with the current URL by default.

| State | Param | Shape | Example |
|-------|-------|-------|---------|
| `queryText` | `q` | full query string | `?q=createdBy:jane%20is:starred%20dashboard` |
| `sort` | `sort` | `field:direction` | `?sort=updatedAt:desc` |

Empty query text removes `q`. The resolved initial sort removes `sort`, keeping default URLs compact. Unrelated host-app query params are preserved verbatim — values are written using an RFC 3986–friendly encoder, so Rison-style params (e.g. `_g`, `_a`) keep their readable form (parens, colons, commas, `!`, etc.) instead of being percent-encoded on every rewrite.

Every URL write uses `history.replace`, so listing-page interactions (typing, filter toggles, sort changes) refine the current entry instead of adding to the back stack. Browser Back/Forward leaves the listing page.

Legacy TableListView URLs using `s`, `title`, `sort`, `sortdir`, `created_by`, and `favorites` are decoded on first load and rewritten to the new `q` / `sort` shape. New-shape params win when both old and new params are present.

Use `features={{ urlSync: false }}` for embedded lists, modals, sidebars, or secondary lists that share a route with another URL-synced list. Only one list per route should leave URL sync enabled unless the lists intentionally share the same URL state.

#### Implementation note: one source of truth

`queryText` from state flows directly to `EuiSearchBar`'s `query` prop. There is no `displayText` mirror, no typing ref, and no internal sync hack — the search bar is fully controlled. Both search-box typing and committed filter changes dispatch `SET_QUERY` through the same path; `ContentListUrlSync` writes the resulting URL with `history.replace`.

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
| `useContentListItems()` | `{ items, totalItems, isLoading, isFetching, error, hasNoItems, hasNoResults, hasActiveQuery, refetch }` | Access loaded items, loading/fetching flags, and empty-state signals. |
| `useContentListPhase()` | `ContentListPhase` | Derive the current render phase (`'initialLoad' \| 'empty' \| 'filtering' \| 'filtered' \| 'populated'`) from provider state. |
| `useContentListSort()` | `{ field, direction, setSort, isSupported }` | Read/update sort configuration. |
| `useContentListSearch()` | `{ queryText, setQueryFromEuiQuery, setQueryFromText, isSupported, fieldNames }` | Read/update the search bar query text. |
| `useContentListPagination()` | `{ page, setPage, isSupported }` | Read/update pagination state. |
| `useContentListSelection()` | `{ selectedItems, selectedCount, clearSelection }` | Access the current row selection and clear it. |
| `useContentListFilters()` | `{ filters, clearFilters }` | Read derived `ActiveFilters` from `queryText` and clear all structured filters (preserving free-text search). |
| `useFilterToggle(fieldName)` | `(id: string, type?: 'include' \| 'exclude') => void` | Toggle a value in any field filter via EUI Query mutations. |
| `useTagFilterToggle()` | `(value: string) => void` | Convenience wrapper around `useFilterToggle` for the `tag` field. |
| `useCreatedByFilterToggle()` | `(value: string) => void` | Convenience wrapper around `useFilterToggle` for the `createdBy` field. |
| `useFilterFacets(filterId, opts?)` | `UseQueryResult<FilterFacet[]>` | Fetch display-ready `FilterFacet[]` for a filter popover (lazy, via React Query). Pass `{ enabled: isOpen }` to fire on popover open. |
| `useDeleteConfirmation(options?)` | `{ requestDelete, deleteModal }` | Trigger a delete confirmation flow. Call `requestDelete(items)` to open the modal; render `deleteModal` in the tree. |
| `useProfileCache()` | `ProfileCache \| undefined` | Access the shared profile cache instance. Returns `undefined` when user profiles are not configured. |
| `useProfileCacheVersion()` | `number` | Subscribe to cache version changes. Re-renders only when profiles are loaded. |
| `useProfile(uid)` | `UserProfileEntry \| undefined` | Resolve a single profile by UID. Self-loading via batched requests. |
