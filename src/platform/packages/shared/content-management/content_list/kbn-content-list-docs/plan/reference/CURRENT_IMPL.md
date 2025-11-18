# TableListView - Technical Implementation

This document details the technical architecture and implementation for engineers reviewing or implementing changes.

> [!IMPORTANT]  
> These documents were written and revised in a long-running conversation with **Claude 4.5 Sonnet**, in **Cursor**.  Since they're meant to serve
> as a starting point for the Agent-driven implmentation phase, they should be considered ~80% accurate and certainly subject to change.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Interface (Props)](#component-interface-props)
3. [Key Technical Patterns](#key-technical-patterns)
4. [State Shape](#state-shape)
5. [Service Dependencies](#service-dependencies)
6. [Column Building Logic](#column-building-logic)
7. [Performance Considerations](#performance-considerations)
8. [Testing Approach](#testing-approach)
9. [Known Technical Debt](#known-technical-debt)
10. [Migration Considerations](#migration-considerations)

---

## Architecture Overview

The current implementation consists of three main layers:

### 1. TableListView (Wrapper Component)
**File**: `src/packages/table_list_view/src/table_list_view.tsx`  
**Size**: 133 lines  
**Responsibilities**:
- Wraps content in `KibanaPageTemplate`
- Provides page header (title, description, actions)
- Minimal logic, mostly layout concerns

**Key Props**:
- `title` - Page title
- `description` - Optional description text
- `headingId` - ARIA heading ID
- `children` - Additional content below table
- All props from `TableListViewTable` (passed through)

### 2. TableListViewTable (Core Logic Component)
**File**: `src/packages/table_list_view_table/src/table_list_view_table.tsx`  
**Size**: 1,226 lines (large file)  
**Responsibilities**:
- Contains ALL business logic
- State management via reducer
- Data fetching with debouncing
- URL state synchronization
- Search query parsing and management
- Tag, user, and favorites filtering
- Sorting and pagination
- Content editor integration
- Delete modal management
- Column building and customization
- Error handling
- Empty state handling

**State Management**:
- Custom reducer with 9 action types:
  - `ON_FETCH_ITEMS`
  - `ON_ITEMS_FETCHED`
  - `ON_ITEMS_FETCHED_ERROR`
  - `ON_SEARCH_CHANGE`
  - `ON_SORT_CHANGE`
  - `ON_PAGE_CHANGE`
  - `ON_ROW_SELECT`
  - `ON_FILTER_CHANGE`
  - `ON_DELETE_ITEMS`
- State split between:
  - Reducer state (table data, pagination, selection)
  - Local React state (modals, flyouts)
  - URL state (search, filters, sort)
  - Session storage (page size preference)

**Data Flow**:
1. URL params parsed on mount
2. State initialized from URL
3. `fetchItems` called (debounced 300ms)
4. Results populate table
5. User interactions update state
6. State changes trigger URL updates
7. URL changes trigger re-fetch

### 3. Table (Presentation Component)
**File**: `src/packages/table_list_view_table/src/components/table.tsx`  
**Size**: 409 lines  
**Responsibilities**:
- Renders `EuiInMemoryTable`
- Search box and toolbar
- Filter panels (tags, users, favorites)
- Context providers (focus management, favorites)

---

## Component Interface (Props)

### Required Props (18)
```typescript
{
  entityName: string;              // e.g., "dashboard"
  entityNamePlural: string;        // e.g., "dashboards"
  tableListTitle: string;          // e.g., "Dashboards"
  findItems: FindItemsCallback;    // Async function to fetch items
  createItem?: () => void;         // Create button handler
  editItem?: (item) => void;       // Edit button handler (or URL)
  deleteItems?: (items) => Promise; // Delete handler
  getDetailViewLink?: (item) => string; // Item link URL
  listingLimit: number;            // Max items to fetch
  initialFilter?: string;          // URL query param name
  initialPageSize?: number;        // Default page size
  id: string;                      // Component instance ID
  urlStateEnabled?: boolean;       // URL state sync
  // ... more
}
```

### Optional Customization Props (12+)
```typescript
{
  customTableColumn?: ColumnDefinition;   // Add 1 custom column
  emptyPrompt?: ReactNode;                // Replace empty state
  additionalRightSideActions?: Action[];  // Max 2 header buttons
  rowItemActions?: RowActionConfig;       // Disable row actions
  customSortingOptions?: SortOption[];    // Add sort options
  titleColumnName?: string;               // Rename title column
  contentEditor?: ContentEditorConfig;    // Inline edit modal
  withoutPageTemplateWrapper?: boolean;   // Skip page wrapper (deprecated)
  // ... more
}
```

---

## Key Technical Patterns

### URL State Management
- Uses browser history API
- Syncs state to URL query params:
  - `s` - search term
  - `sort` - sort field and direction
  - Custom param for filters (e.g., `filter` or `initialFilter`)
- Debounced updates (300ms) to prevent URL thrashing
- Backward compatible with existing URLs

### Search Query Parsing
```typescript
// Supports KQL-style syntax:
// - Simple text: "my dashboard"
// - Field search: "title:my dashboard"
// - Quoted phrases: "title:\"exact match\""
```

### Data Fetching Strategy
- Debounced fetch (300ms delay after state change)
- AbortController for request cancellation
- Loading states during fetch
- Error handling with retry capability
- Result caching in component state

### Filter Management
Three independent filter systems:
1. **Tag Filter**: Multi-select with include/exclude
2. **User Filter**: Multi-select creator filter
3. **Favorites Filter**: Boolean toggle

Filters combine with AND logic:
```typescript
results = items
  .filter(matchesSearchQuery)
  .filter(matchesSelectedTags)
  .filter(matchesSelectedUsers)
  .filter(matchesFavoritesToggle)
```

### Content Editor Integration
Optional inline editing via modal:
- Opens modal overlay
- Validates title uniqueness
- Updates tags
- Shows activity history
- Calls `updateItem` on save
- Refreshes table after update

---

## State Shape

```typescript
interface State {
  // Data
  items: Item[];
  totalItems: number;
  
  // UI State
  isFetchingItems: boolean;
  isDeletingItems: boolean;
  showDeleteModal: boolean;
  showContentEditor: boolean;
  
  // Selection
  selectedIds: string[];
  
  // Pagination
  pagination: {
    pageIndex: number;
    pageSize: number;
    totalItemCount: number;
  };
  
  // Sorting
  sortField: string;
  sortDirection: 'asc' | 'desc';
  
  // Search & Filters
  searchQuery: string;
  selectedTags: Tag[];
  selectedUsers: User[];
  showFavoritesOnly: boolean;
  
  // Error
  fetchError?: Error;
}
```

---

## Service Dependencies

### Required Services (via Context)
- `savedObjectsTagging` - Tag management
- `contentInsights` - View counts, favorites
- `currentAppId$` - App identification
- `navigateToUrl` - Navigation
- `toasts` - Notifications

### Injected via KibanaPageTemplate
- `application` - App services
- `chrome` - Browser chrome
- `http` - HTTP client

---

## Column Building Logic

Columns are dynamically built based on configuration:

**Default Columns**:
1. Selection checkbox (if bulk actions enabled)
2. Title column (always present)
3. Last updated timestamp
4. Creator (user avatar or "Managed" badge)
5. Custom column (if provided)
6. Actions column (edit, delete buttons)

**Conditional Rendering**:
- Creator column hidden if `createdByEnabled === false`
- Actions column hidden if no edit/delete handlers
- Selection column hidden if `rowItemActions.delete === false`

**Column Configuration**:
```typescript
{
  field: 'attributes.title',
  name: titleColumnName || 'Name',
  sortable: true,
  render: (title, item) => (
    <TitleColumn 
      item={item}
      icon={getItemIcon(item)}
      badge={item.managed ? 'Managed' : null}
    />
  )
}
```

---

## Performance Considerations

### Current Performance Characteristics
- **Bundle Size**: ~180KB (uncompressed)
- **Initial Render**: Depends on `findItems` latency
- **Re-renders**: Optimized with `useMemo` for columns
- **Search Debounce**: 300ms (prevents excessive API calls)
- **Listing Limit**: Configurable, typically 1000-10000 items

### Known Performance Issues
- Large reducer (1200+ lines) in single file
- Monolithic component causes excessive re-renders
- All features loaded even if unused
- Column building happens on every render (mitigated by `useMemo`)

---

## Testing Approach

### Unit Tests
- Reducer logic tested in isolation
- Column building functions tested
- Search query parsing tested
- Filter combination logic tested

### Integration Tests
- Full component rendering
- User interactions (search, filter, sort)
- Modal workflows (delete, edit)
- URL state synchronization
- Tag/user/favorites filtering

### Manual Testing Scenarios
- Fast typing in search (debounce behavior)
- Bulk delete with many items
- Tag filter with many tags
- Navigation with URL sharing
- Mobile responsive behavior

---

## Known Technical Debt

1. **Monolithic Component**: 1226-line file violates single responsibility
2. **Prop Drilling**: 30+ props passed through multiple layers
3. **State Fragmentation**: State split across reducer, local, URL, storage
4. **Tight Coupling**: Services, URL state, and page template tightly coupled
5. **Limited Extensibility**: Adding features requires modifying core files
6. **Deprecated Pattern**: `withoutPageTemplateWrapper` is a workaround
7. **CSS Injection**: Some consumers use custom CSS to style cells

---

## Migration Considerations

### Backward Compatibility Requirements
- URL state format must remain compatible
- Existing prop interfaces must be supported
- Session storage keys must match
- Public API contracts preserved

### Breaking Changes to Avoid
- Changing URL parameter names
- Removing or renaming required props
- Changing callback signatures
- Modifying saved preferences format

---

## Related Documents

- [CURRENT_USAGE.md](./CURRENT_USAGE.md) - Usage patterns and pain points
- [CURRENT_FEATURES.md](./CURRENT_FEATURES.md) - User-facing features
- [PROPOSAL_CONTENT_LIST_PAGE.md](../proposals/PROPOSAL_CONTENT_LIST_PAGE.md) - Proposed refactoring approach
- [CURRENT_DEV_HISTORY.md](./CURRENT_DEV_HISTORY.md) - Historical bug fixes

