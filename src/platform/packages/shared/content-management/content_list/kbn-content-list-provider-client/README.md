# @kbn/content-list-provider-client

Client-side Content List Provider — designed for easy migration from `TableListView`.

## Overview

This package provides a client-side adapter for content listing that wraps existing `TableListView`-style `findItems` functions. It enables consumers to migrate from `TableListView` to the new `ContentListProvider` architecture with minimal code changes.

## When to Use

Use this provider when:

- **Migrating from `TableListView`** with minimal code changes.
- Working with **smaller datasets** (< 10,000 items).
- Your existing `findItems` implementation already handles data fetching.

## How It Works

This adapter is designed for easy migration from `TableListView`. It:

- **Passes only `searchQuery`** to your existing `findItems` function (matching `TableListView` behavior).
- **Applies client-side sorting and pagination** on the returned results — your `findItems` fetches all matching items, and the adapter sorts and paginates in memory.
- **Does not forward** `sort`, `page`, or `filters` parameters to your `findItems` implementation.
- **Caches by `searchQuery`** — React Query caches results based on the search query. Changing sort or page reuses cached data.

## Usage

### Basic Migration from TableListView

The key migration step is passing your existing `findItems` function:

```tsx
import { ContentListClientProvider } from '@kbn/content-list-provider-client';

// Your existing findItems function from TableListView - no changes needed!
const findItems = useCallback(
  async (searchTerm) => {
    return dashboardClient.search({
      search: searchTerm,
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

### Using the Adapter Function Directly

If you need more control, you can use the adapter function directly:

```tsx
import { createFindItemsFn } from '@kbn/content-list-provider-client';
import { ContentListProvider } from '@kbn/content-list-provider';

// Wrap your existing findItems.
const findItems = createFindItemsFn(myExistingFindItems);

// Use with the base provider.
<ContentListProvider
  id="dashboard"
  labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
  dataSource={{ findItems }}
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
| `findItems` | `TableListViewFindItemsFn` | Yes | Your existing `TableListView` findItems function. |
| `features` | `ContentListFeatures` | No | Feature configuration. |
| `item` | `ContentListItemConfig` | No | Per-item configuration for links. |
| `isReadOnly` | `boolean` | No | Disable mutation actions. |

*At least one of `id` or `queryKeyScope` is required.

## findItems Function Signature

Your existing `findItems` function should match this signature:

```typescript
interface SavedObjectReference {
  type: string;
  id: string;
  name?: string;
}

type TableListViewFindItemsFn = (
  searchQuery: string,
  refs?: {
    references?: SavedObjectReference[];
    referencesToExclude?: SavedObjectReference[];
  }
) => Promise<{ total: number; hits: UserContentCommonSchema[] }>;
```

This is the same signature expected by `TableListView.findItems`.

> **Note:** The `refs` parameter (for tag filtering) is not yet supported in the new `ContentListProvider` architecture. Only `searchQuery` is forwarded in this initial version. Tag filtering support is planned for a future release.

## Exports

```typescript
// Provider component.
export { ContentListClientProvider } from './provider';
export type { ContentListClientProviderProps } from './provider';

// Adapter for direct usage.
export { createFindItemsFn } from './strategy';

// Types.
export type {
  TableListViewFindItemsFn,
  TableListViewFindItemsResult,
  SavedObjectReference,
} from './types';
```

## Related Packages

- [`@kbn/content-list-provider`](../kbn-content-list-provider) — Core provider and hooks.
