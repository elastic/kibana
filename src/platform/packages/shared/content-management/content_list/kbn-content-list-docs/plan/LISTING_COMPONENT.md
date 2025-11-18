# ContentList UI Components

## Document Purpose

This document specifies the UI components for the ContentList system. It defines the component APIs, usage patterns, and composition strategies.

**Related Documents:**
- **[LISTING_PROVIDER.md](./LISTING_PROVIDER.md)** - Provider implementation details
- **[LISTING_PAGE.md](./LISTING_PAGE.md)** - Page wrapper component specification
- **[RECIPES.md](./RECIPES.md)** - Usage examples and migration patterns
- **[PLAN.md](./PLAN.md)** - Implementation phases

> **API Documentation:** For current API details, see the README files in each package:
> - [`kbn-content-list-table/README.md`](../../kbn-content-list-table/README.md)
> - [`kbn-content-list-toolbar/README.md`](../../kbn-content-list-toolbar/README.md)
> - [`kbn-content-list-grid/README.md`](../../kbn-content-list-grid/README.md)
> - [`kbn-content-list-footer/README.md`](../../kbn-content-list-footer/README.md)

---

## Table of Contents

1. [Overview](#overview)
2. [ContentListTable](#contentlisttable)
3. [ContentListToolbar](#contentlisttoolbar)
4. [ContentListGrid](#contentlistgrid)
5. [ContentListFooter](#contentlistfooter)
6. [Complete Examples](#complete-examples)
7. [Accessibility](#accessibility)

---

## Overview

The ContentList component system provides composable UI components for displaying and managing content lists in Kibana.

**Core Concepts:**
- **ContentListProvider** - Central state management and configuration.
- **Compound components** - Flexible composition with `Column.*`, `Action.*` namespaces.
- **Marker pattern** - Declarative configuration via JSX children.
- **Smart defaults** - Auto-renders based on provider configuration.
- **Read-only mode** - Single prop disables all actions.

---

## ContentListTable

**Package:** `@kbn/content-list-table`

Table renderer with declarative column and action configuration.

### Basic Usage

```tsx
import { ContentListTable } from '@kbn/content-list-table';

// Default columns (Name, UpdatedAt, Actions)
<ContentListTable />

// Custom columns via compound components
const { Column, Action } = ContentListTable;

<ContentListTable>
  <Column.Name showTags />
  <Column.UpdatedAt />
  <Column.CreatedBy />
  <Column.Actions>
    <Action.Edit />
    <Action.Delete />
  </Column.Actions>
</ContentListTable>
```

### Props Interface

```tsx
interface ContentListTableProps {
  /** Row customization (expandable rows). */
  renderDetails?: (item: ContentListItem) => ReactNode;
  
  /** Custom empty state component. */
  emptyState?: ReactNode;
  
  'data-test-subj'?: string;
  
  /** Column components as children. */
  children?: ReactNode;
}
```

### Built-in Columns

| Column | Props | Description |
|--------|-------|-------------|
| `Column.Name` | `showDescription`, `showTags`, `width` | Title, description, tags with link support. |
| `Column.UpdatedAt` | `width` | Formatted timestamp. |
| `Column.CreatedBy` | `width` | User profile with avatar. |
| `Column.Actions` | `width`, children (Action components) | Row actions menu. |

### Built-in Actions

| Action | Handler Source | Description |
|--------|----------------|-------------|
| `Action.ViewDetails` | `item.actions.onViewDetails` | Open details flyout. |
| `Action.Edit` | `item.actions.onEdit` | Edit item. |
| `Action.Delete` | `item.actions.onDelete` | Delete with confirmation. |
| `Action.Duplicate` | `item.actions.onDuplicate` | Clone item. |
| `Action.Export` | `item.actions.onExport` | Export item. |
| `Action.Custom` | `handler` prop (required) | Custom action. |

### Custom Actions

```tsx
<Column.Actions>
  <Action.Edit />
  <Action.Custom
    id="share"
    label="Share"
    iconType="share"
    handler={(item) => handleShare(item)}
    tooltip="Share with team"
  />
  <Action.Delete />
</Column.Actions>
```

### Custom Columns

```tsx
<ContentListTable>
  <Column.Name />
  <Column
    id="status"
    name="Status"
    width="120px"
    render={(item) => <EuiBadge>{item.status}</EuiBadge>}
  />
  <Column.UpdatedAt />
  <Column.Actions />
</ContentListTable>
```

### Empty States

```tsx
import {
  NoItemsEmptyState,
  NoResultsEmptyState,
  ErrorEmptyState,
} from '@kbn/content-list-table';

// Custom empty state
<ContentListTable
  emptyState={<NoItemsEmptyState onCreate={handleCreate} />}
/>
```

---

## ContentListToolbar

**Package:** `@kbn/content-list-toolbar`

Container for search, filters, and selection actions.

### Basic Usage

```tsx
import { ContentListToolbar } from '@kbn/content-list-toolbar';

// Smart defaults - auto-renders based on provider configuration
<ContentListToolbar />

// Custom layout with compound components
<ContentListToolbar>
  <ContentListToolbar.Filters>
    <SortFilter />
    <TagsFilter />
    <CreatedByFilter />
    <StarredFilter />
  </ContentListToolbar.Filters>
  <ContentListToolbar.SelectionActions>
    <DeleteAction />
    <ExportAction />
  </ContentListToolbar.SelectionActions>
</ContentListToolbar>
```

### Sub-components

| Component | Description |
|-----------|-------------|
| `ContentListToolbar.Filters` | Container for filter markers. |
| `ContentListToolbar.SelectionActions` | Container for bulk actions. |
| `ContentListToolbar.CreateButton` | Global create action. |
| `ContentListToolbar.Button` | Pre-styled toolbar button. |

### Filter Markers

```tsx
import {
  SortFilter,
  TagsFilter,
  CreatedByFilter,
  StarredFilter,
} from '@kbn/content-list-toolbar';
```

| Filter | Description |
|--------|-------------|
| `SortFilter` | Sort field and direction dropdown. |
| `TagsFilter` | Tag include/exclude filter. |
| `CreatedByFilter` | User profile filter. |
| `StarredFilter` | Favorites toggle. |

### Selection Actions

```tsx
import {
  DeleteAction,
  ExportAction,
  SelectionAction,
} from '@kbn/content-list-toolbar';

<ContentListToolbar.SelectionActions>
  <DeleteAction />
  <ExportAction />
  <SelectionAction
    id="tag"
    label="Tag"
    iconType="tag"
    handler={(items) => openTagModal(items)}
  />
</ContentListToolbar.SelectionActions>
```

### Toolbar Button

```tsx
<ContentListToolbar.Button iconType="inspect" onClick={handleDiagnostics}>
  Diagnostics
</ContentListToolbar.Button>
```

---

## ContentListGrid

**Package:** `@kbn/content-list-grid`

Grid/card-based rendering for visual content.

### Basic Usage

```tsx
import { ContentListGrid, ViewModeToggle, type ViewMode } from '@kbn/content-list-grid';

<ContentListGrid iconType="dashboardApp" />

// With view mode toggle
const [viewMode, setViewMode] = useState<ViewMode>('table');

<ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
{viewMode === 'table' ? <ContentListTable /> : <ContentListGrid iconType="dashboardApp" />}
```

### Props Interface

```tsx
interface ContentListGridProps {
  /** EUI icon type for cards. */
  iconType?: string;
  
  /** Custom card render function. */
  renderCard?: (item: ContentListItem) => ReactNode;
  
  'data-test-subj'?: string;
}
```

### Card Layout

Each card displays:
- **Top**: Icon and title (clickable link).
- **Middle**: Truncated description.
- **Bottom left**: Tags (if `supports.tags` is enabled).
- **Bottom right**: Starred button (if `supports.starred` is enabled).

```
┌─────────────────────────────┐
│  [icon]  Dashboard Title    │
│                             │
│  Description text that      │
│  truncates after two lines  │
│                             │
│  [tag1] [tag2]        [★]   │
└─────────────────────────────┘
```

### View Mode Toggle

```tsx
import { ViewModeToggle, type ViewMode } from '@kbn/content-list-grid';

const [viewMode, setViewMode] = useState<ViewMode>('table');

<ViewModeToggle
  viewMode={viewMode}
  onChange={setViewMode}
/>
```

---

## ContentListFooter

**Package:** `@kbn/content-list-footer`

Footer component for pagination and additional metadata.

### Basic Usage

```tsx
import { ContentListFooter } from '@kbn/content-list-footer';

// Smart default - auto-renders pagination if enabled
<ContentListFooter />

// Custom layout with slots
<ContentListFooter>
  <ContentListFooter.Left>
    <ItemCountDisplay />
  </ContentListFooter.Left>
  <ContentListFooter.Center>
    <ContentListFooter.Pagination />
  </ContentListFooter.Center>
  <ContentListFooter.Right>
    <ExportAllButton />
  </ContentListFooter.Right>
</ContentListFooter>
```

### Props Interface

```tsx
interface ContentListFooterProps {
  /** Custom content. If omitted, renders pagination. */
  children?: ReactNode;
  
  'data-test-subj'?: string;
}
```

### Sub-components

| Component | Description |
|-----------|-------------|
| `ContentListFooter.Pagination` | EUI pagination controls. |
| `ContentListFooter.Left` | Left slot for custom content. |
| `ContentListFooter.Center` | Center slot. |
| `ContentListFooter.Right` | Right slot. |

### Pagination Props

```tsx
interface PaginationProps {
  /** Page size options for dropdown. */
  pageSizeOptions?: number[];
  
  /** Show page size selector. */
  showPerPageOptions?: boolean;
  
  /** Compact display. */
  compressed?: boolean;
}
```

---

## Complete Examples

### Client Provider (TableListView Migration)

```tsx
import { ContentListClientKibanaProvider } from '@kbn/content-list-provider-client';
import { ContentListTable } from '@kbn/content-list-table';
import { ContentListToolbar } from '@kbn/content-list-toolbar';

// Your existing findItems function.
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

### Server Provider (New Implementation)

```tsx
import { ContentListServerKibanaProvider } from '@kbn/content-list-provider-server';
import { ContentListTable } from '@kbn/content-list-table';
import { ContentListToolbar } from '@kbn/content-list-toolbar';

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
    selection: { onSelectionDelete: deleteMaps },
  }}
  item={{
    getHref: (item) => `/app/maps/${item.id}`,
    actions: { onEdit: editMap },
  }}
>
  <ContentListToolbar />
  <ContentListTable />
</ContentListServerKibanaProvider>
```

### Read-Only Mode

```tsx
<ContentListClientKibanaProvider
  findItems={findMaps}
  entityName="map"
  entityNamePlural="maps"
  services={{ core: coreStart, savedObjectsTagging: taggingService }}
  isReadOnly={!hasWritePermission}
  item={{
    actions: { onEdit: editMap },  // Ignored when isReadOnly=true.
  }}
  features={{
    selection: { onSelectionDelete: deleteMaps },  // Ignored when isReadOnly=true.
  }}
>
  <ContentListToolbar />
  <ContentListTable />
</ContentListClientKibanaProvider>
```

### Embedded in Flyout

```tsx
<EuiFlyout onClose={onClose}>
  <EuiFlyoutHeader>
    <EuiTitle><h2>Select a file</h2></EuiTitle>
  </EuiFlyoutHeader>
  
  <EuiFlyoutBody>
    <ContentListProvider
      entityName="file"
      entityNamePlural="files"
      dataSource={{ findItems: findFiles }}
    >
      <ContentListToolbar />
      <ContentListTable>
        <Column.Name />
        <Column.UpdatedAt />
      </ContentListTable>
    </ContentListProvider>
  </EuiFlyoutBody>
</EuiFlyout>
```

### Content Editor Integration

The list components integrate with `@kbn/content-management-content-editor` for inline metadata editing:

```tsx
import { useOpenContentEditor } from '@kbn/content-management-content-editor';

function DashboardListing() {
  const openEditor = useOpenContentEditor();
  
  const handleViewDetails = (item) => {
    openEditor({
      item: {
        id: item.id,
        title: item.title,
        description: item.description,
        tags: item.tags,
      },
      entityName: 'dashboard',
      onSave: async (updatedItem) => {
        await updateDashboardMetadata(updatedItem);
      },
    });
  };
  
  return (
    <ContentListClientKibanaProvider
      item={{
        actions: { onViewDetails: handleViewDetails },
      }}
      features={{ contentEditor: true }}
      {...props}
    >
      <ContentListToolbar />
      <ContentListTable />
    </ContentListClientKibanaProvider>
  );
}
```

---

## Accessibility

All components follow WCAG 2.1 AA standards.

### Keyboard Navigation

- **Tab** - Navigate through interactive elements.
- **Enter/Space** - Activate buttons and links.
- **Arrow keys** - Navigate table rows.
- **Escape** - Close modals and popovers.

### Screen Reader Support

```tsx
<Column.Actions>
  <Action.Custom
    id="clone"
    label="Clone"
    iconType="copy"
    handler={(item) => clone(item)}
    aria-label="Clone item"
  />
</Column.Actions>
```

### Focus Management

- Modals trap focus.
- Focus returns to trigger on close.
- ARIA live regions for dynamic updates.

---

## See Also

- [`kbn-content-list-table/README.md`](../../kbn-content-list-table/README.md) - Table API.
- [`kbn-content-list-toolbar/README.md`](../../kbn-content-list-toolbar/README.md) - Toolbar API.
- [`kbn-content-list-grid/README.md`](../../kbn-content-list-grid/README.md) - Grid API.
- [`kbn-content-list-footer/README.md`](../../kbn-content-list-footer/README.md) - Footer API.
