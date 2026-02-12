# @kbn/content-list-table

Table component for rendering content listings with configurable columns. Wraps `EuiBasicTable` and integrates with `ContentListProvider` for data, sorting, and state management.

## Usage

The table renders inside a `ContentListProvider` and reads items, loading state, and configuration from context.

```tsx
import { ContentListTable } from '@kbn/content-list-table';

// Defaults to a Name column.
<ContentListTable title="Dashboards" />
```

### Custom columns

Use the `Column` compound component to declare columns as children. Order in JSX determines order in the table.

```tsx
const { Column } = ContentListTable;

<ContentListTable title="Dashboards">
  <Column.Name width="40%" />
  <Column
    id="status"
    name="Status"
    render={(item) => <EuiBadge>{item.status}</EuiBadge>}
  />
</ContentListTable>
```

### Available column presets

| Component | Description |
|-----------|-------------|
| `Column.Name` | Title with optional description. |

Custom columns use the `Column` component with `id`, `name`, and `render` props.

