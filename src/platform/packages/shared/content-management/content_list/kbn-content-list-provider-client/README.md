# @kbn/content-list-provider-client

Client-side Content List Provider — designed for easy migration from `TableListView`.

## Overview

This package provides a client-side adapter for content listing that wraps existing `TableListView`-style `findItems` functions. It enables consumers to migrate from `TableListView` to the new `ContentListProvider` architecture with minimal code changes.

## When to Use

Use this provider when:

- **Migrating from `TableListView`** with minimal code changes.
- Working with **smaller datasets** (< 10,000 items).
- Your existing `findItems` implementation already handles data fetching.

## Current Limitations

This adapter is a migration stepping stone. It currently:

- **Passes only `searchQuery`** to your existing `findItems` function (sorting, pagination, and filtering are handled client-side).
- **Does not forward** `sort`, `page`, or `filters` parameters to your `findItems` implementation — the adapter fetches a single result set per `searchQuery` and applies sorting and pagination in memory.
- **Caches results by `searchQuery`** only — changing sort/page will reuse the cached results and reapply client-side sorting and pagination, but will not trigger a new fetch.

For full server-side sorting and pagination support, use `ContentListProvider` directly with a custom `findItems` implementation.

## Usage

### Basic Migration from TableListView

The key migration step is passing your existing `findItems` function:

```tsx
import { ContentListClientProvider } from '@kbn/content-list-provider-client';

// Your existing findItems function from TableListView - no changes needed!
const findItems = useCallback(
  async (searchTerm, { references, referencesToExclude } = {}) => {
    return dashboardClient.search({
      search: searchTerm,
      tags: {
        included: (references ?? []).map(({ id }) => id),
        excluded: (referencesToExclude ?? []).map(({ id }) => id),
      },
    }).then(({ total, dashboards }) => ({
      total,
      hits: dashboards.map(transformToDashboardUserContent),
    }));
  },
  []
);

// Before: TableListView
<TableListView
  findItems={findItems}
  entityName="dashboard"
  entityNamePlural="dashboards"
  // ...other props
/>

// After: ContentListClientProvider
<ContentListClientProvider
  id="dashboard"
  labels={{
    entity: i18n.translate('dashboard.listing.entity', { defaultMessage: 'dashboard' }),
    entityPlural: i18n.translate('dashboard.listing.entityPlural', { defaultMessage: 'dashboards' }),
  }}
  findItems={findItems}
>
  <MyDashboardList />
</ContentListClientProvider>
```

### Using the Adapter Directly

If you need more control, you can use the adapter directly:

```tsx
import { createFindItemsAdapter } from '@kbn/content-list-provider-client';
import { ContentListProvider } from '@kbn/content-list-provider';

// Wrap your existing findItems.
const { findItems, clearCache } = createFindItemsAdapter({
  findItems: myExistingFindItems,
});

// Use with the base provider.
<ContentListProvider
  id="dashboard"
  labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
  dataSource={{ findItems, clearCache }}
>
  <MyListComponent />
</ContentListProvider>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | Yes* | Unique identifier. `queryKeyScope` derived as `${id}-listing` if not provided. |
| `queryKeyScope` | `string` | Yes* | Explicit React Query cache key scope. |
| `labels` | `ContentListLabels` | Yes | User-facing entity labels (should be i18n-translated). |
| `findItems` | `TableListViewFindItemsFn<T>` | Yes | Your existing `TableListView` findItems function. |
| `transform` | `TransformFunction<T>` | No | Custom transform for items. |
| `features` | `ContentListFeatures` | No | Feature configuration. |
| `item` | `ContentListItemConfig` | No | Per-item configuration for links. |
| `isReadOnly` | `boolean` | No | Disable mutation actions. |

*At least one of `id` or `queryKeyScope` is required.

## How It Works

The adapter wraps your existing `findItems` function and:

1. **Receives** the new structured `FindItemsParams` (searchQuery, filters, sort, page).
2. **Extracts `searchQuery`** and passes it to your existing function.
3. **Calls** your existing `findItems(searchQuery)`.
4. **Caches** the result by `searchQuery` to avoid redundant fetches.
5. **Returns** structured `FindItemsResult`.

**Note:** The adapter does not forward `refs`, `sort`, `page`, or `filters` to your `findItems` function. Sorting and pagination are applied client-side on the cached result set.

## findItems Function Signature

Your existing `findItems` function should match this signature:

```typescript
type TableListViewFindItemsFn<T> = (
  searchQuery: string,
  refs?: {
    references?: Array<{ type: string; id: string }>;
    referencesToExclude?: Array<{ type: string; id: string }>;
  }
) => Promise<{ total: number; hits: T[] }>;
```

This is the same signature expected by `TableListView.findItems`.

## Exports

```typescript
// Provider component.
export { ContentListClientProvider } from './provider';
export type { ContentListClientProviderProps } from './provider';

// Adapter for direct usage.
export { createFindItemsAdapter } from './strategy';
export type { TableListViewFindItemsFn } from './strategy';
```

## Related Packages

- [`@kbn/content-list-provider`](../kbn-content-list-provider) — Core provider and hooks.
