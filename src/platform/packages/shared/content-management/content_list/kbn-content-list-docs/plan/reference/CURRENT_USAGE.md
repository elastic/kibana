# TableListView - Current State

## Document Purpose

This document analyzes the current `TableListView` implementation: where it's used, how consumers use it, and what problems they face. This analysis informs the new architecture design.

**Related Documents:**
- **[CURRENT_FEATURES.md](./CURRENT_FEATURES.md)** - Complete feature inventory
- **[CURRENT_IMPL.md](./CURRENT_IMPL.md)** - Technical implementation details
- **[proposals/PROPOSAL_CONTENT_LIST_PAGE.md](../proposals/PROPOSAL_CONTENT_LIST_PAGE.md)** - Proposed refactoring

---

## Table of Contents

1. [What is TableListView?](#what-is-tablelistview)
2. [Where It's Used](#where-its-used)
3. [Consumer Details](#consumer-details)
   - [Dashboard](#1-dashboard-srcplatformpluginsshareddashboard)
   - [Visualizations](#2-visualizations-srcplatformpluginsharedvisualizations)
   - [Maps](#3-maps-x-packplatformpluginsharedmaps)
   - [Graph](#4-graph-x-packplatformpluginsprivategraph)
   - [Files Management](#5-files-management-srcplatformpluginsprivatefiles_management)
   - [Event Annotations](#6-event-annotations-srcplatformpluginsprivateevent_annotation_listing)
4. [Usage Patterns Summary](#usage-patterns-summary)
5. [Key Insights](#key-insights)
6. [Key Problems](#key-problems)

---

## What is TableListView?

`TableListView` is a comprehensive content management component used across Kibana to display and manage user-generated content like dashboards, visualizations, maps, and more. It provides a table-based interface with search, filtering, sorting, and CRUD operations.

**Key Stats**:
- **27 user-facing features** (see [CURRENT_FEATURES.md](./CURRENT_FEATURES.md))
- **1,768 total lines** of code across 3 main components (see [CURRENT_IMPL.md](./CURRENT_IMPL.md))
  - Note: Including related utilities, services, and types brings the total to ~3,000 lines
- **6 primary consumers** in the codebase
- **82+ commits** of continuous development (see [CURRENT_DEV_HISTORY.md](./CURRENT_DEV_HISTORY.md))

---

## Where It's Used

TableListView is used by 6 primary consumers across Kibana:

1. **Dashboard** - Full-featured with favorites, recently accessed, content editor
2. **Visualizations** - Tabbed variant with custom columns and styling
3. **Maps** - Simple implementation, minimal customization
4. **Graph** - Custom empty prompts with sample data integration
5. **Files Management** - Embedded without page template, custom actions
6. **Event Annotations** - Direct table usage without wrapper

---

## Consumer Details

### 1. Dashboard (`src/platform/plugins/shared/dashboard`)

**What they use:**
- Content editor with custom validators (duplicate title checking)
- Recently accessed integration
- Favorites support
- Custom empty prompt
- Children slot for unsaved dashboards list
- Full CRUD operations
- User/creator filtering

**Pain points:**
- Complex setup across multiple hooks and components
- Heavy lifting in `useDashboardListingTable` (366 lines)
- Can't easily customize the toolbar

### 2. Visualizations (`src/platform/plugins/shared/visualizations`)

**What they use:**
- `TabbedTableListView` variant for multiple tabs
- Custom table column (type icons with experimental badges)
- Custom sorting options
- Custom CSS styling for table cells
- Complex empty prompt with callout above table
- Custom row actions (disabled edit for read-only)
- `getOnClickTitle` for custom navigation

**Pain points:**
- Uses `TableListViewTable` directly (not `TableListView`) within tabs
- Custom CSS injection to style table cells
- Can't customize search or filter behavior
- Callout must be rendered as child, not ideal positioning

### 3. Maps (`x-pack/platform/plugins/shared/maps`)

**What they use:**
- Simple configuration (minimal customization)
- Basic CRUD operations based on capabilities
- Custom navigation with `getOnClickTitle`
- No custom columns or empty prompts

**Pain points:**
- None major - this is the "happy path" use case
- Still renders unnecessary features they don't use

### 4. Graph (`x-pack/platform/plugins/private/graph`)

**What they use:**
- Custom empty prompt with sample data links
- Conditional features based on capabilities
- URL query parameter for initial filter
- Custom navigation

**Pain points:**
- Can't easily add custom content between elements
- Empty prompt is all-or-nothing replacement

### 5. Files Management (`src/platform/plugins/private/files_management`)

**What they use:**
- `withoutPageTemplateWrapper` (embedded in Management)
- Custom column (file size with formatting)
- `additionalRightSideActions` for diagnostics flyout
- Custom row actions (disable delete per file kind)
- Custom navigation handler
- External flyouts for file details and diagnostics

**Pain points:**
- Limited to 2 additional actions (arbitrary limit)
- Can't position diagnostics button optimally
- Flyouts managed separately from table state
- Title click opens flyout, not ideal for every use case

### 6. Event Annotations (`src/platform/plugins/private/event_annotation_listing`)

**What they use:**
- `TableListViewTable` directly (not wrapper)
- Custom column (data view tags)
- Custom empty prompt
- Edit flyout integration
- No page template wrapper

---

## Usage Patterns Summary

| Feature | Dashboard | Visualizations | Maps | Graph | Files | Annotations |
|---------|-----------|----------------|------|-------|-------|-------------|
| Custom empty prompt | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| Custom columns | ✗ | ✓ | ✗ | ✗ | ✓ | ✓ |
| Content editor | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Additional actions | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| Custom row actions | ✗ | ✓ | ✗ | ✗ | ✓ | ✗ |
| No page template | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| Children slot | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Custom navigation | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Recently accessed | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Favorites | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| User filtering | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Tabbed variant | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |

---

## Key Insights

1. **High variance in usage** - No two consumers use the same features
2. **Modal/Flyout pattern** - Many need to open modals/flyouts from items (Dashboard unsaved, Visualizations wizard, Files details)
3. **Embedded usage** - Files Management and Event Annotations need to work without page template
4. **Custom content placement** - Teams need to inject content at various positions (above table, below toolbar, etc.)
5. **Navigation diversity** - Teams use both `getDetailViewLink` (URLs) and `getOnClickTitle` (handlers) in different ways
6. **TabbedTableListView needed** - Visualizations uses a tab variant that wraps the core component

---

## Key Problems

### 1. Monolithic Design
- `TableListViewTable` has too many responsibilities (1,226 lines)
- Difficult to understand, test, and maintain
- Changes risk breaking multiple features

### 2. Limited Customization
Teams can only customize through:
- `customTableColumn` - add ONE column
- `emptyPrompt` - replace empty state
- `additionalRightSideActions` - add header buttons (max 2)
- `rowItemActions` - disable row actions
- `customSortingOptions` - add sort options
- `titleColumnName` - rename title column

**What teams CAN'T do:**
- Replace the table with a grid or card layout
- Customize the search box behavior
- Add custom filters beyond tags/users/favorites
- Modify the toolbar layout
- Add custom bulk actions
- Customize pagination UI
- Add content above/below the table
- Use without page template (requires deprecated hack)

### 3. Excessive Prop Drilling
The component accepts 30+ props, many of which are passed through multiple layers:
- 18 required configuration props
- 12+ optional customization props
- Props scattered across 3 component files
- Difficult to track data flow

### 4. Tight Coupling
- Page template is mandatory (with a deprecated workaround)
- Search and filters are inseparable
- Table is the only rendering option
- URL state management is all-or-nothing
- Service dependencies injected globally

### 5. State Management Complexity
- Reducer with 9 action types mixed with component logic
- State split between reducer, local state, and URL state
- Effects with debouncing and async behavior
- Difficult to extend or customize state shape

### 6. Poor Extensibility
Adding new features requires:
- Modifying core component files
- Adding new props to already crowded interfaces
- Risk of breaking existing consumers
- Centralized decision-making bottleneck

---

## Related Documents

- [CURRENT_FEATURES.md](./CURRENT_FEATURES.md) - Complete feature inventory
- [CURRENT_IMPL.md](./CURRENT_IMPL.md) - Technical implementation details
- [CURRENT_DEV_HISTORY.md](./CURRENT_DEV_HISTORY.md) - Bug fixes and enhancements
- [PROPOSAL_CONTENT_LIST_PAGE.md](../proposals/PROPOSAL_CONTENT_LIST_PAGE.md) - Proposed refactoring approach
