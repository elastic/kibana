# @kbn/content-list-provider-client

Client-side Content List Provider for Kibana - designed for easy migration from `TableListView`.

## Overview

This package provides a client-side adapter for content listing that wraps existing `TableListView`-style `findItems` functions. It enables consumers to migrate from `TableListView` to the new `ContentListProvider` architecture with minimal code changes.

## When to Use

Use this provider when:

- **Migrating from `TableListView`** with minimal code changes.
- Working with **smaller datasets** (< 10,000 items).
- Your existing `findItems` implementation already handles data fetching.
- Client-side sorting and pagination overhead is acceptable.

For larger datasets or server-side operations, use [`@kbn/content-list-provider-server`](../kbn-content-list-provider-server) instead.

## Usage

### Basic Migration from TableListView

The key migration step is simply passing your existing `findItems` function:

```tsx
import { ContentListClientKibanaProvider } from '@kbn/content-list-provider-client';

// Your existing findItems function from TableListView - no changes needed!
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

// Before: TableListView
<TableListView
  findItems={findItems}
  entityName="dashboard"
  entityNamePlural="dashboards"
  // ...other props
/>

// After: ContentListClientKibanaProvider - just pass your findItems!
<ContentListClientKibanaProvider
  findItems={findItems}
  entityName="dashboard"
  entityNamePlural="dashboards"
  services={{
    core: coreStart,
    savedObjectsTagging: savedObjectsTaggingService?.getTaggingApi(),
    favorites: favoritesService,
  }}
>
  <MyDashboardList />
</ContentListClientKibanaProvider>
```

### Using the Adapter Directly

If you need more control, you can use the adapter directly:

```tsx
import { createFindItemsAdapter } from '@kbn/content-list-provider-client';
import { ContentListProvider } from '@kbn/content-list-provider';

// Wrap your existing findItems.
const { findItems } = createFindItemsAdapter({
  findItems: myExistingFindItems,
});

// Use with the base provider.
<ContentListProvider
  entityName="dashboard"
  entityNamePlural="dashboards"
  dataSource={{ findItems }}
  services={services}
>
  <MyListComponent />
</ContentListProvider>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `findItems` | `TableListViewFindItemsFn<T>` | Yes | Your existing `TableListView` findItems function. |
| `entityName` | `string` | Yes | Singular entity name (e.g., "dashboard"). |
| `entityNamePlural` | `string` | Yes | Plural entity name (e.g., "dashboards"). |
| `services` | `ContentListKibanaServices` | Yes | Kibana services (core, savedObjectsTagging, favorites). |
| `features` | `ContentListFeatures` | No | Feature configuration. |
| `transform` | `TransformFunction<T>` | No | Custom transform for items. |
| `isReadOnly` | `boolean` | No | Disable mutation actions. |
| `queryKeyScope` | `string` | No | React Query cache key scope. |
| `item` | `ItemConfig` | No | Per-item configuration for links and actions. |

## How It Works

The adapter wraps your existing `findItems` function and:

1. **Receives** the new structured `FindItemsParams` (searchQuery, filters, sort, page).
2. **Maps** `filters.tags` to `references` / `referencesToExclude` format.
3. **Calls** your existing `findItems(searchQuery, { references, referencesToExclude })`.
4. **Applies** client-side user filtering (since `TableListView` doesn't support this).
5. **Applies** client-side sorting.
6. **Applies** client-side pagination.
7. **Returns** structured `FindItemsResult`.

This matches the original `TableListView` behavior where sorting and pagination are handled client-side after fetching all items.

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
export { ContentListClientKibanaProvider } from './provider';
export type { ContentListClientKibanaProviderProps } from './provider';

// Adapter for direct usage.
export { createFindItemsAdapter } from './strategy';
export type {
  TableListViewFindItemsFn,
  CreateFindItemsAdapterOptions,
  CreateFindItemsAdapterResult,
  SavedObjectReference,
} from './strategy';
```

## Related Packages

- [`@kbn/content-list-provider`](../kbn-content-list-provider) - Core provider and hooks.
- [`@kbn/content-list-provider-server`](../kbn-content-list-provider-server) - Server-side strategy for larger datasets.
