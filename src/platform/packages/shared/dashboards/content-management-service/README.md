# @kbn/dashboard-content-management-service

Minimal helpers for dashboard-specific operations on Kibana’s Content Management API.

---

## Getting the service

```ts
import { getDashboardContentManagementService } from '@kbn/dashboard-content-management-service';

const { findDashboards } = getDashboardContentManagementService(core.contentManagement);
```

---

## `findDashboards` methods

| Method        | Signature                                                            | Purpose                                                                       |
| ------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `search`      | `search({ search, size, options?, hasReference?, hasNoReference? })` | Full-text search with optional tag filters. Returns `{ total, hits }`.        |
| `findById`    | `findById(id)`                                                       | Fetch a single dashboard by id (cached).                                      |
| `findByIds`   | `findByIds(ids)`                                                     | Fetch multiple dashboards in parallel.                                        |
| `findByTitle` | `findByTitle(title)`                                                 | Resolve the id of a dashboard whose title matches exactly (case-insensitive). |

### Quick examples

```ts
// The service already knows the CM client, so calls are terse:

// 1. Search dashboards titled "sales*"
const { hits } = await findDashboards.search({ search: 'sales', size: 20 });

// 2. Fetch a dashboard by id
const result = await findDashboards.findById('abc123');

// 3. Fetch many dashboards in one go
const results = await findDashboards.findByIds(['a', 'b', 'c']);
```

---
