# Choosing a Content List Provider

This guide helps you choose the right provider for migrating from `TableListView` to the Content List system.

## Provider Options

| Provider | Package | Best For |
|----------|---------|----------|
| **Client** | `@kbn/content-list-provider-client` | Saved Objects with client-side operations |
| **Base** | `@kbn/content-list-provider` | Custom data sources |

---

## Decision Guide

### Use `ContentListClientKibanaProvider` when:

- Your data is stored as **Saved Objects**
- Dataset is **< 10,000 items**
- You need **exact TableListView behavior** (client-side sorting/filtering)
- Migrating existing code with minimal changes

```tsx
import { ContentListClientKibanaProvider } from '@kbn/content-list-provider-client';

<ContentListClientKibanaProvider
  contentType="dashboard"
  // ... props
/>
```

See the [Client Migration Guide](../kbn-content-list-provider-client/MIGRATION.md) for detailed examples.

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

## Related Documentation

- [@kbn/content-list-provider-client](../kbn-content-list-provider-client) — Client-side provider for Saved Objects.
- [README](./README.md) — Base provider API reference.
