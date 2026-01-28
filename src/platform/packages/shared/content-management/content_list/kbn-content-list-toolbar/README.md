# @kbn/content-list-toolbar

Toolbar component for content listing pages with smart defaults and full customization.

## Overview

The `ContentListToolbar` provides a ready-to-use toolbar that integrates seamlessly with `@kbn/content-list-provider`. It offers:

- **Smart Defaults**: Auto-renders search, selection actions, and filters based on provider configuration.
- **Compound Components**: Full customization via declarative marker components.
- **Zero Configuration**: Works out of the box with sensible defaults.
- **Progressive Enhancement**: Start simple, customize as needed.

## Quick Start

### Smart Defaults (Zero Config)

The simplest usage - just render the toolbar and it will automatically configure itself based on your `ContentListProvider` settings:

```tsx
import { ContentListProvider } from '@kbn/content-list-provider';
import { ContentListToolbar } from '@kbn/content-list-toolbar';

function MyListingPage() {
  return (
    <ContentListProvider
      entityName="dashboard"
      entityNamePlural="dashboards"
      dataSource={{ findItems: fetchDashboards }}
      search={true}
      sorting={true}
      selection={{ onSelectionDelete: handleDelete }}
    >
      {/* Auto-renders search, selection actions, and filters based on config */}
      <ContentListToolbar />
      
      <ContentListTable />
    </ContentListProvider>
  );
}
```

## Custom Layout

Use compound components for full control over filter order and selection actions:

```tsx
import { ContentListToolbar } from '@kbn/content-list-toolbar';

const { Filters, SelectionActions } = ContentListToolbar;

function MyListingPage() {
  return (
    <ContentListProvider {...config}>
      <ContentListToolbar>
        <SelectionActions>
          <SelectionActions.Delete />
          <SelectionActions.Action
            id="export"
            label="Export"
            iconType="exportAction"
            onSelect={handleExport}
          />
        </SelectionActions>
        <Filters>
          <Filters.Sort />
          <Filters.Tags tagManagementUrl="/app/management/tags" />
          <Filters.CreatedBy />
          <Filters.Starred />
        </Filters>
      </ContentListToolbar>
      
      <ContentListTable />
    </ContentListProvider>
  );
}
```

## How It Works

The `ContentListToolbar` uses `EuiSearchBar` internally, providing:

- A search input field with incremental search (debouncing handled by EUI).
- Filter popovers for tags, users, starred, sorting, and custom filters.
- Selection action buttons that appear when items are selected.

### Smart Defaults

When no children are provided, the toolbar automatically:

1. Checks the provider configuration.
2. Renders enabled filters in default order: Starred, Sort, Tags, CreatedBy.
3. Shows selection actions (like Delete) when items are selected.
4. Uses the search placeholder from config if provided.

### Declarative Configuration

Use `<Filters>` and `<SelectionActions>` marker components to customize:

- **Filter order**: Children order determines display order.
- **Filter props**: Pass props like `tagManagementUrl` to individual filter markers.
- **Custom actions**: Add actions beyond the built-in Delete.

## Sub-Components

### ContentListToolbar.Filters

Container for filter marker components. Controls which filters appear and in what order.

**Sub-components**:

- `Filters.Starred` - Toggle filter for starred items.
- `Filters.Sort` - Dropdown for sort field and direction.
- `Filters.Tags` - Multi-select tag filter with include/exclude support.
- `Filters.CreatedBy` - User profile picker with avatars.
- `Filters.Filter` - Custom filter referencing `filtering.custom[field]` config.

**Example**:

```tsx
const { Filters } = ContentListToolbar;

<ContentListToolbar>
  <Filters>
    <Filters.Starred />
    <Filters.Sort />
    <Filters.Tags tagManagementUrl="/app/management/tags" />
    <Filters.CreatedBy showNoUserOption={true} />
    <Filters.Filter field="status" />
  </Filters>
</ContentListToolbar>
```

### ContentListToolbar.SelectionActions

Container for selection action marker components. Controls which actions are available when items are selected.

**Sub-components**:

- `SelectionActions.Delete` - Built-in delete action (uses provider's `onSelectionDelete`).
- `SelectionActions.Action` - Custom action with handler.

**Example**:

```tsx
const { SelectionActions } = ContentListToolbar;

<ContentListToolbar>
  <SelectionActions>
    <SelectionActions.Delete />
    <SelectionActions.Action
      id="export"
      label="Export"
      iconType="exportAction"
      onSelect={async (items) => { await exportItems(items); }}
    />
    <SelectionActions.Action
      id="archive"
      label="Archive"
      iconType="folderClosed"
      onSelect={handleArchive}
      isVisible={(items) => items.every(i => i.status !== 'archived')}
    />
  </SelectionActions>
</ContentListToolbar>
```

### ContentListToolbar.Button

Convenience wrapper for adding custom toolbar buttons.

**Props**:

- `iconType?: string` - Icon to display.
- `onClick: () => void` - Click handler.
- `color?: 'primary' | 'success' | 'warning' | 'danger' | 'text' | 'accent'` - Button color (default: 'primary').
- `children: ReactNode` - Button content.
- `data-test-subj?: string` - Test subject.

**Example**:

```tsx
<ContentListToolbar.Button 
  iconType="plus" 
  onClick={handleCreate}
  color="primary"
>
  Create Dashboard
</ContentListToolbar.Button>
```

## API Reference

### ContentListToolbarProps

```typescript
interface ContentListToolbarProps {
  /** Optional children for declarative configuration via Filters and SelectionActions. */
  children?: ReactNode;
  /** Optional data-test-subj attribute for testing. */
  'data-test-subj'?: string;
}
```

### FiltersProps

```typescript
interface FiltersProps {
  /** Filter marker components as children. */
  children?: ReactNode;
}
```

### Filter Marker Props

```typescript
interface StarredFilterProps {
  /** Custom label (default: "Starred"). */
  name?: string;
  'data-test-subj'?: string;
}

interface SortFilterProps {
  'data-test-subj'?: string;
}

interface TagsFilterProps {
  /** URL to the tag management page. Shows "Manage tags" link in popover. */
  tagManagementUrl?: string;
  'data-test-subj'?: string;
}

interface CreatedByFilterProps {
  /** Whether to include the "No creators" option. @default true */
  showNoUserOption?: boolean;
  /** Whether Kibana versioning is enabled. @default false */
  isKibanaVersioningEnabled?: boolean;
  'data-test-subj'?: string;
}

interface FilterProps {
  /** Field key referencing filtering.custom[field] in provider config. */
  field: string;
  /** Whether multiple values can be selected. @default true */
  multiSelect?: boolean;
  'data-test-subj'?: string;
}
```

### SelectionActionsProps

```typescript
interface SelectionActionsProps {
  /** Action marker components as children. */
  children?: ReactNode;
}
```

### Action Marker Props

```typescript
interface DeleteActionProps {
  'data-test-subj'?: string;
}

interface ActionProps {
  /** Unique identifier for the action. */
  id: string;
  /** Display label for the action button. */
  label: string;
  /** EUI icon type for the action button. */
  iconType?: string;
  /** Handler called with selected items. */
  onSelect: (selectedItems: ContentListItem[]) => void | Promise<void>;
  /** Function to determine if action should be shown. */
  isVisible?: (selectedItems: ContentListItem[]) => boolean;
  /** Function to determine if action should be enabled. */
  isEnabled?: (selectedItems: ContentListItem[]) => boolean;
  'data-test-subj'?: string;
}
```

### ToolbarButtonProps

```typescript
interface ToolbarButtonProps {
  /** Icon type to display in the button. */
  iconType?: string;
  /** Click handler. */
  onClick: () => void;
  /** Button color. */
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'text' | 'accent';
  /** Button content. */
  children: ReactNode;
  'data-test-subj'?: string;
}
```

## Usage Patterns

### Default Configuration

```tsx
// Uses smart defaults - auto-renders based on provider config.
<ContentListToolbar />
```

### Custom Filter Order

```tsx
const { Filters } = ContentListToolbar;

<ContentListToolbar>
  <Filters>
    <Filters.Sort />
    <Filters.Tags />
  </Filters>
</ContentListToolbar>
```

### Custom Selection Actions

```tsx
const { SelectionActions } = ContentListToolbar;

<ContentListToolbar>
  <SelectionActions>
    <SelectionActions.Delete />
    <SelectionActions.Action id="export" label="Export" onSelect={handleExport} />
  </SelectionActions>
</ContentListToolbar>
```

### Full Customization

```tsx
const { Filters, SelectionActions } = ContentListToolbar;

<ContentListToolbar>
  <SelectionActions>
    <SelectionActions.Delete />
    <SelectionActions.Action id="export" label="Export" onSelect={handleExport} />
  </SelectionActions>
  <Filters>
    <Filters.Sort />
    <Filters.Tags tagManagementUrl="/app/management/tags" />
    <Filters.CreatedBy />
    <Filters.Starred />
    <Filters.Filter field="status" />
  </Filters>
</ContentListToolbar>
```

## Testing

All components include `data-test-subj` attributes for testing:

```tsx
// Default test subjects
<ContentListToolbar data-test-subj="contentListToolbar" />

// Custom test subjects on markers
<Filters.Tags data-test-subj="myTagsFilter" />
<SelectionActions.Delete data-test-subj="myDeleteButton" />
```

## Dependencies

- `@kbn/content-list-provider` - Provider hooks and configuration.
- `@elastic/eui` - UI components.
- `react` - React library.

## Related Packages

- [`@kbn/content-list-provider`](../kbn-content-list-provider) - State management provider.
- [`@kbn/content-list-table`](../kbn-content-list-table) - Table component.
