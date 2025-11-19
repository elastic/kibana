# Choosing a Content List Provider

This guide helps you choose the right provider for migrating from `TableListView` to the Content List system.

## Provider Options

| Provider | Package | Best For |
|----------|---------|----------|
| **Client** | `@kbn/content-list-provider-client` | Smaller datasets, TableListView compatibility |
| **Server** | `@kbn/content-list-provider-server` | Larger datasets, advanced search |
| **Base** | `@kbn/content-list-provider` | Custom data sources (non-Saved Objects) |

---

## Decision Guide

### Use `ContentListClientKibanaProvider` when:

- Dataset is **< 10,000 items**
- You need **exact TableListView behavior** (client-side sorting/filtering)
- Migrating existing code with minimal changes

```tsx
import { ContentListClientKibanaProvider } from '@kbn/content-list-provider-client';

<ContentListClientKibanaProvider
  savedObjectType="dashboard"
  // ... props
/>
```

See the [Client Migration Guide](../kbn-content-list-provider-client/MIGRATION.md) for detailed examples.

---

### Use `ContentListServerKibanaProvider` when:

- Dataset is **> 10,000 items**
- Content types lack `.keyword` mappings
- You need **multi-type search** across different saved object types
- Server-side user profile resolution is beneficial
- You want **built-in debouncing** for search requests

```tsx
import { ContentListServerKibanaProvider } from '@kbn/content-list-provider-server';

<ContentListServerKibanaProvider
  savedObjectType="map"
  // ... props
/>
```

See the [Server Migration Guide](../kbn-content-list-provider-server/MIGRATION.md) for detailed examples.

---

### Use `ContentListProvider` directly when:

- Data comes from a **custom API** (not Saved Objects)
- You need **full control** over data fetching logic
- Building a **non-Kibana** application

```tsx
import { ContentListProvider } from '@kbn/content-list-provider';

<ContentListProvider
  dataSource={{
    findItems: async ({ searchQuery, filters, sort, page }) => {
      // Your custom fetching logic.
      return { items, total };
    },
  }}
  // ... props
/>
```

See the [README](./README.md) for the base provider API.

---

## Quick Comparison

| Feature | Client | Server |
|---------|--------|--------|
| Data fetching | Saved Objects `_find` API | Content Management `list` API |
| Sorting | Client-side | Server-side |
| Filtering | Mixed (tags server, users client) | All server-side |
| Pagination | Client-side | Server-side |
| User profiles | Client fetches separately | Included in response |
| Multi-type search | No | Yes |
| Debouncing | None (immediate) | 300ms built-in |
| Max items | `savedObjects:listingLimit` | Unlimited (paginated) |

---

## Related Documentation

- [@kbn/content-list-provider-client](../kbn-content-list-provider-client) — Client-side provider.
- [@kbn/content-list-provider-server](../kbn-content-list-provider-server) — Server-side provider.
- [README](./README.md) — Base provider API reference.
