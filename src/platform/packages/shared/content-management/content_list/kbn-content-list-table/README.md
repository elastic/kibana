# @kbn/content-list-table

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Usage](#usage)
  - [Declarative Column Configuration](#declarative-column-configuration)
  - [Built-in Columns](#built-in-columns)
  - [Custom Columns](#custom-columns)
    - [Type-Safe Custom Columns](#type-safe-custom-columns)
  - [Custom Actions](#custom-actions)
  - [Row Selection with Bulk Actions](#row-selection-with-bulk-actions)
  - [Expandable Rows](#expandable-rows)
  - [Filtering Items](#filtering-items)
  - [Read-Only Mode](#read-only-mode)
  - [Empty States](#empty-states)
- [Architecture](#architecture)
  - [Compound Component Pattern](#compound-component-pattern)
  - [Provider Integration](#provider-integration)
  - [Data Flow](#data-flow)
- [API](#api)

## Overview

A declarative React table component for rendering content lists in Kibana. This package provides a flexible, compound-component API for building content management UIs with minimal boilerplate.

> **Note:** This package is the modern replacement for the legacy `TableListView` component. It offers a cleaner API, better TypeScript support, and improved composability through separation of concerns.

## Quick Start

Wrap your table with [`ContentListProvider`](../kbn-content-list-provider/README.md) and let defaults handle the rest:

```tsx
import { ContentListProvider } from '@kbn/content-list-provider';
import { ContentListTable } from '@kbn/content-list-table';

const MyDashboardList = () => (
  <ContentListProvider
    entityName="dashboard"
    entityNamePlural="dashboards"
    dataSource={{ findItems }}
    item={{
      getHref: (item) => `/app/dashboards/${item.id}`,
      actions: {
        onEdit: (item) => navigateToEdit(item.id),
        onDelete: (item) => confirmDelete(item),
      },
    }}
  >
    <ContentListTable title="Dashboards" />
  </ContentListProvider>
);
```

With no children, the table renders **Name**, **UpdatedAt**, and **Actions** columns using the provider's configuration.

## Usage

### Declarative Column Configuration

Columns are configured as JSX children using compound components. Destructure `Column` and `Action` from `ContentListTable` for cleaner code:

```tsx
const { Column, Action } = ContentListTable;

<ContentListTable title="My Dashboards">
  <Column.Name showDescription showTags />
  <Column.UpdatedAt />
  <Column.Actions>
    <Action.Edit />
    <Action.Delete />
  </Column.Actions>
</ContentListTable>
```

### Built-in Columns

#### `Column.Name`

The primary column displaying item title with optional metadata.

```tsx
<Column.Name
  showDescription    // Show description below title
  showTags           // Show tag badges inline
  showStarred        // Show starred toggle button
  width="50%"        // CSS width value
/>
```

#### `Column.UpdatedAt`

Displays the last modified timestamp with relative formatting.

```tsx
<Column.UpdatedAt width="150px" />
```

#### `Column.CreatedBy`

Displays the creator's user profile (requires `userProfiles` support in provider).

```tsx
<Column.CreatedBy width="150px" />
```

#### `Column.Actions`

Container for row action buttons. Actions appear as icon buttons or in a popover menu based on count.

```tsx
<Column.Actions>
  <Action.ViewDetails />
  <Action.Edit />
  <Action.Duplicate />
  <Action.Export />
  <Action.Delete />
</Column.Actions>
```

#### `Column.Expander`

Toggle button for expandable row details. Use with the `renderDetails` prop.

```tsx
<ContentListTable
  title="Dashboards"
  renderDetails={(item) => <DetailPanel item={item} />}
>
  <Column.Expander />
  <Column.Name />
  <Column.Actions>...</Column.Actions>
</ContentListTable>
```

### Custom Columns

Create custom columns using the base `Column` component:

```tsx
const { Column, Action } = ContentListTable;

<ContentListTable title="Dashboards">
  <Column.Name width="40%" />
  
  {/* Custom status column */}
  <Column
    id="status"
    name="Status"
    width="100px"
    render={(item) => (
      <EuiBadge color={item.updatedAt ? 'success' : 'default'}>
        {item.updatedAt ? 'Published' : 'Draft'}
      </EuiBadge>
    )}
  />
  
  {/* Custom tags column (instead of inline) */}
  <Column
    id="tags"
    name="Tags"
    render={(item) => <TagList tagIds={item.tags} />}
  />
  
  <Column.UpdatedAt />
  <Column.Actions>
    <Action.Edit />
  </Column.Actions>
</ContentListTable>
```

#### Type-Safe Custom Columns

The `Column` component accepts a generic type parameter to extend `ContentListItem` with custom fields. This provides full type safety in your render function:

```tsx
const { Column, Action } = ContentListTable;

// Define your custom data type.
type MyCustomData = {
  status?: 'active' | 'draft' | 'archived';
  priority?: number;
};

<ContentListTable title="Dashboards">
  <Column.Name width="40%" />
  
  {/* Custom column with type-safe access to custom fields */}
  <Column<MyCustomData>
    id="status"
    name="Status"
    width="120px"
    render={(item) => {
      // `item.status` is typed as 'active' | 'draft' | 'archived' | undefined
      const status = item.status ?? 'draft';
      const colors = { active: 'success', draft: 'default', archived: 'warning' } as const;
      return <EuiBadge color={colors[status]}>{status}</EuiBadge>;
    }}
  />
  
  <Column<MyCustomData>
    id="priority"
    name="Priority"
    width="80px"
    render={(item) => {
      // `item.priority` is typed as number | undefined
      return <EuiText size="s">{item.priority ?? '—'}</EuiText>;
    }}
  />
  
  <Column.UpdatedAt />
  <Column.Actions>
    <Action.Edit />
  </Column.Actions>
</ContentListTable>
```

### Custom Actions

Add custom row actions alongside built-in ones:

```tsx
const { Column, Action } = ContentListTable;

<Column.Actions>
  <Action.Edit />
  
  {/* Custom action */}
  <Action
    id="share"
    label="Share"
    iconType="share"
    tooltip="Share with team"
    handler={(item) => openShareModal(item)}
  />
  
  <Action.Delete />
</Column.Actions>
```

### Row Selection with Bulk Actions

Enable selection by configuring `features.selection` in the provider:

```tsx
<ContentListProvider
  // ...other config
  features={{
    selection: {
      onSelectionDelete: (items) => bulkDelete(items),
      onSelectionExport: (items) => bulkExport(items),
    },
  }}
>
  <ContentListTable title="Dashboards">
    {/* Checkboxes appear automatically */}
  </ContentListTable>
</ContentListProvider>
```

### Expandable Rows

Provide a `renderDetails` function to enable row expansion:

```tsx
<ContentListTable
  title="Dashboards"
  renderDetails={(item) => (
    <EuiPanel color="subdued" paddingSize="m">
      <EuiText size="s">{item.description}</EuiText>
      <EuiCodeBlock>{JSON.stringify(item, null, 2)}</EuiCodeBlock>
    </EuiPanel>
  )}
  canExpand={(item) => Boolean(item.description)} // Optional predicate
>
  <Column.Expander />
  <Column.Name />
  <Column.UpdatedAt />
</ContentListTable>
```

The `renderDetails` function supports async content:

```tsx
renderDetails={async (item) => {
  const details = await fetchDetails(item.id);
  return <DetailView data={details} />;
}}
```

### Filtering Items

Use the `filter` prop when multiple tables share a provider but display different subsets:

```tsx
<ContentListProvider dataSource={{ findItems }}>
  {/* Only show dashboards */}
  <ContentListTable
    title="Dashboards"
    filter={(item) => item.type === 'dashboard'}
  />
  
  {/* Only show visualizations */}
  <ContentListTable
    title="Visualizations"
    filter={(item) => item.type === 'visualization'}
  />
</ContentListProvider>
```

### Read-Only Mode

Disable all editing capabilities for viewer contexts:

```tsx
<ContentListProvider isReadOnly>
  <ContentListTable title="Dashboards (View Only)" />
</ContentListProvider>
```

### Empty States

The table auto-detects empty states, or you can customize them:

```tsx
import {
  NoItemsEmptyState,
  NoResultsEmptyState,
  ErrorEmptyState,
} from '@kbn/content-list-table';

// Auto-detection (default)
<ContentListTable title="Dashboards" />

// Custom empty state
<ContentListTable
  title="Dashboards"
  emptyState={<MyCustomEmptyState />}
/>
```

| Component | When Shown |
|-----------|------------|
| `NoItemsEmptyState` | Collection is empty (first-time use) |
| `NoResultsEmptyState` | Search/filters return no matches |
| `ErrorEmptyState` | Data fetching failed |

## Architecture

### Compound Component Pattern

The table uses a compound component pattern where configuration is expressed as JSX children rather than prop objects:

```
ContentListTable
├── Column.Name          # Built-in column components
├── Column.UpdatedAt
├── Column.CreatedBy
├── Column.Actions
│   ├── Action.Edit      # Built-in action components
│   ├── Action.Delete
│   └── Action (custom)  # Custom action via base component
├── Column.Expander
└── Column (custom)      # Custom column via base component
```

Children are parsed at render time to build the `EuiBasicTable` column configuration. This enables:
- **Type-safe props** per column/action type
- **Conditional rendering** via standard JSX patterns
- **Composition** with custom components

### Provider Integration

The table is stateless — all data and configuration flows from `ContentListProvider`:

| Provider Config | Table Behavior |
|-----------------|----------------|
| `item.actions.onEdit` | Enables `<Action.Edit />` |
| `item.actions.onDelete` | Enables `<Action.Delete />` |
| `item.getHref` | Makes title a clickable link |
| `features.selection` | Enables row checkboxes |
| `isReadOnly` | Disables actions and selection |

Actions without a corresponding provider handler are automatically hidden.

### Data Flow

```
ContentListProvider (state management)
        │
        ├── items, isLoading, error
        ├── itemConfig (actions, getHref)
        ├── isReadOnly, supports (tags, favorites, userProfiles)
        │
        ▼
ContentListTable (rendering)
        │
        ├── Parses Column/Action children
        ├── Builds EuiBasicTable columns
        ├── Handles selection, sorting, expansion
        │
        ▼
EuiBasicTable (EUI)
```

## API

### `ContentListTableProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | *required* | Accessible table caption |
| `children` | `ReactNode` | — | Column configuration (defaults to Name, UpdatedAt, Actions) |
| `renderDetails` | `(item) => ReactNode` | — | Enables expandable rows |
| `canExpand` | `(item) => boolean` | — | Predicate for row expandability |
| `filter` | `(item) => boolean` | — | Client-side item filter |
| `emptyState` | `ReactNode` | — | Custom empty state component |
| `tableLayout` | `'auto' \| 'fixed'` | `'auto'` | Table column sizing strategy |
| `compressed` | `boolean` | `false` | Use compact table style |
| `data-test-subj` | `string` | `'content-list-table'` | Test subject for selectors |

For detailed type information on column and action props, see the TypeScript definitions in [`index.ts`](./index.ts) and [`types.ts`](./types.ts).

### Storybook

Explore interactive examples in Storybook:

```bash
yarn storybook --include @kbn/content-list-table
```

Or view the stories at `Content Management/Content List/Table`.
