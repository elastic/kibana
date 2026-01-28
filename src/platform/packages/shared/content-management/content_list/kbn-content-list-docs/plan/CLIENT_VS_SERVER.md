# Client vs Server Providers

## Document Purpose

This document explains when to use `ContentListClientKibanaProvider` versus `ContentListServerKibanaProvider`, their differences, and the trade-offs involved.

**Related Documents:**
- **[LISTING_PROVIDER.md](./LISTING_PROVIDER.md)** - Provider implementation details
- **[RECIPES.md](./RECIPES.md)** - Code examples and migration patterns

---

## Quick Decision Guide

| Scenario | Provider |
|----------|----------|
| Migrating from `TableListView` | **Client** |
| New implementation from scratch | **Server** |
| Consumer already has `findItems` | **Client** |
| Need full user filter resolution | **Server** |
| Large datasets (10,000+ items) | **Server** |

---

## ContentListClientKibanaProvider

**Package:** `@kbn/content-list-provider-client`

Use this provider when **migrating from `TableListView`**. It accepts your existing `findItems` function unchanged and handles sorting/pagination client-side.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  ContentListClientKibanaProvider                            │
│                                                             │
│  1. User types search or changes tags                       │
│     └─> Calls consumer's findItems(searchQuery, refs)       │
│         └─> Caches result                                   │
│                                                             │
│  2. User changes sort or page                               │
│     └─> Uses cached result (no server call)                 │
│     └─> Sorts/paginates client-side                         │
│                                                             │
│  3. User filters by createdBy:(username)                    │
│     └─> Resolves username to UID via cached profiles        │
│     └─> Filters cached result client-side                   │
│                                                             │
│  4. User filters by is:starred                              │
│     └─> Fetches favorite IDs                                │
│     └─> Filters cached result client-side                   │
└─────────────────────────────────────────────────────────────┘
```

### Advantages

- **Zero migration effort** - Your existing `findItems` works unchanged.
- **Fewer server calls** - Caches results; sort/page changes don't re-fetch.
- **Fast sorting/pagination** - Client-side processing is instant.

### Limitations

- **Username resolution** - Only resolves usernames that appear in the current result set.
- **Memory usage** - All items are loaded into memory for client-side processing.
- **Large datasets** - Not ideal for 10,000+ items.

### Example

```tsx
import { ContentListClientKibanaProvider } from '@kbn/content-list-provider-client';

// Your existing findItems from TableListView - unchanged.
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
>
  <ContentListToolbar />
  <ContentListTable />
</ContentListClientKibanaProvider>
```

---

## ContentListServerKibanaProvider

**Package:** `@kbn/content-list-provider-server`

Use this provider for **new implementations**. It uses the `/internal/content_management/list` endpoint which handles all operations server-side.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  ContentListServerKibanaProvider                            │
│                                                             │
│  Every change (search, tags, sort, page, filters)           │
│  └─> POST /internal/content_management/list                 │
│      {                                                      │
│        type: "dashboard",                                   │
│        searchQuery: "...",                                  │
│        tags: { include: [...], exclude: [...] },            │
│        createdBy: ["u_abc123", "john.doe"],                 │
│        favoritesOnly: true,                                 │
│        sort: { field: "updatedAt", direction: "desc" },     │
│        page: { index: 0, size: 20 }                         │
│      }                                                      │
│                                                             │
│  Server response includes:                                  │
│  - Paginated items with embedded user info                  │
│  - Total count                                              │
│  - Resolved filter mappings                                 │
└─────────────────────────────────────────────────────────────┘
```

### Advantages

- **Full filter resolution** - Server resolves usernames, emails, and UIDs.
- **Efficient pagination** - Only fetches the current page.
- **Large datasets** - Handles 10,000+ items efficiently.
- **Embedded user info** - Response includes `createdByUser` with avatar data.

### Limitations

- **More server calls** - Every sort/page change triggers a request.
- **No existing `findItems`** - Doesn't use consumer's `findItems` function.

### Example

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
>
  <ContentListToolbar />
  <ContentListTable />
</ContentListServerKibanaProvider>
```

---

## Feature Comparison

| Feature | Client Provider | Server Provider |
|---------|-----------------|-----------------|
| Uses existing `findItems` | Yes | No |
| Sort/page without re-fetch | Yes (cached) | No (server call) |
| `createdBy:(username)` filter | Known users only | All users |
| `createdBy:(no-user)` filter | Yes | Yes |
| `is:starred` filter | Yes | Yes |
| Embedded user info | Fetched separately | In response |
| Large datasets (10,000+) | Memory concerns | Efficient |

---

## Filter Resolution Differences

### `createdBy:(username)` Filter

**Client Provider:**
1. Fetches user profiles for UIDs in the current result set.
2. Builds lookup map: `{ "john.doe" → "u_abc123", "john@example.com" → "u_abc123" }`.
3. Resolves `createdBy:john.doe` to `u_abc123` using the map.
4. **Limitation:** Only works for users whose profiles are in the cache.

**Server Provider:**
1. Server receives `createdBy: ["john.doe"]`.
2. Server fetches distinct creators from the index.
3. Server resolves `john.doe` to UID via profile lookup.
4. **No limitation:** Works for any user in the system.

### `createdBy:(no-user)` Filter

Both providers support filtering for items without a creator:

**Client Provider:**
- Filters items where `createdBy` is undefined and `managed` is false.

**Server Provider:**
- Generates ES query: `must_not: { exists: { field: "created_by" } }` AND `managed: false`.

---

## Migration Strategy

### From TableListView

1. **Start with Client Provider** - Minimal changes, reuse `findItems`.
2. **Test thoroughly** - Ensure filtering works as expected.
3. **Consider Server Provider later** - If you need full filter resolution.

### New Implementation

1. **Use Server Provider** - Get all features out of the box.
2. **Configure `savedObjectType`** - The only required prop.

---

## Performance Considerations

### Client Provider

- **Initial load:** One server call to fetch all matching items.
- **Sort/page changes:** No server calls (uses cache).
- **Filter changes:** May or may not re-fetch depending on filter type.
- **Memory:** All items loaded into memory.

### Server Provider

- **Initial load:** One server call for the first page.
- **Sort/page changes:** Server call for each change.
- **Filter changes:** Server call for each change.
- **Memory:** Only current page in memory.

---

## See Also

- [LISTING_PROVIDER.md](./LISTING_PROVIDER.md) - Full provider API documentation.
- [RECIPES.md](./RECIPES.md) - Migration examples with code.
