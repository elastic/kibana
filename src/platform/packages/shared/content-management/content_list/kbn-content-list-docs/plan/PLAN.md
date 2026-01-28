# ContentList Implementation Plan

## Document Purpose

This document describes the phased implementation of the `ContentList` architecture, a composable replacement for the monolithic `TableListView`.

**Related Documents:**
- **[LISTING_PROVIDER.md](./LISTING_PROVIDER.md)** - Provider implementation details
- **[CLIENT_VS_SERVER.md](./CLIENT_VS_SERVER.md)** - When to use Client vs Server providers
- **[RECIPES.md](./RECIPES.md)** - Code examples and migration patterns
- **[proposals/PROPOSAL_CONTENT_LIST_PAGE.md](./proposals/PROPOSAL_CONTENT_LIST_PAGE.md)** - High-level architecture and rationale

> **API Documentation:** For current API details, see the README files in each package:
> - [`kbn-content-list-provider/README.md`](../../kbn-content-list-provider/README.md)
> - [`kbn-content-list-table/README.md`](../../kbn-content-list-table/README.md)
> - [`kbn-content-list-toolbar/README.md`](../../kbn-content-list-toolbar/README.md)
> - [`kbn-content-list-grid/README.md`](../../kbn-content-list-grid/README.md)

---

## Table of Contents

1. [Implementation Overview](#implementation-overview)
2. [Phase 1: Core Provider & State Management](#phase-1-core-provider--state-management)
3. [Phase 2: Basic Rendering Components](#phase-2-basic-rendering-components)
4. [Phase 3: Core Features](#phase-3-core-features)
5. [Phase 4: Quality & Polish](#phase-4-quality--polish)
6. [Phase 5: Integration Features](#phase-5-integration-features)
7. [Phase 6: Experimental Features](#phase-6-experimental-features)
8. [Phase 7: Page Wrapper & Layout](#phase-7-page-wrapper--layout)
9. [Phase 8: Migration Support](#phase-8-migration-support)
10. [Phase 9: Consumer Migrations](#phase-9-consumer-migrations)
11. [Testing Strategy](#testing-strategy)
12. [Risk Management](#risk-management)

---

## Implementation Overview

### Goals

1. **Reduce complexity** - Break the monolithic component into focused components.
2. **Improve flexibility** - Enable composition over configuration.
3. **Maintain compatibility** - Support existing features.
4. **Enable innovation** - Make new layouts (grid, cards) easy to add.
5. **Improve DX** - Better TypeScript, clearer APIs, easier testing.
6. **Address team requirements** - Add features from [#159995](https://github.com/elastic/kibana/issues/159995):
   - Initial filter state (Security team)
   - Preview popovers (Visualisation team)
   - Analytics hooks

### Architecture

The architecture follows a three-provider pattern:

```
┌───────────────────────────────────────────────────────────────────────────┐
│  ContentListClientKibanaProvider    ContentListServerKibanaProvider       │
│  (wraps existing findItems with     (uses /list endpoint with             │
│   client-side processing)            server-side processing)              │
│                                                                           │
│                        ContentListProvider                                │
│                     (base provider for tests)                             │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  Configuration Context (static props)                               │  │
│  │  - Entity names, data source, feature configs                       │  │
│  │  - Accessed via useContentListConfig()                              │  │
│  │                                                                     │  │
│  │  ┌───────────────────────────────────────────────────────────────┐  │  │
│  │  │  State Context (dynamic)                                      │  │  │
│  │  │  - Items, loading, search, filters, pagination                │  │  │
│  │  │  - Managed by reducer + React Query                           │  │  │
│  │  │  - Accessed via feature hooks                                 │  │  │
│  │  └───────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

**Key Design Patterns:**

- **Three providers** - Client for migrations, Server for new implementations, Base for tests and bespoke implementations.
- **Client-side caching** - Client provider caches results to avoid re-fetches on sort/page changes.
- **Feature-based API** - `features={{ search: true, sorting: { fields: [...] } }}`.
- **Service auto-detection** - Tags, starred, user profiles enabled when services are provided.
- **Compound components** - `Column.Name`, `Action.Edit`, `ContentListToolbar.Filters`.
- **Marker pattern** - Declarative configuration via JSX children.
- **Transform-based** - Datasource types converted to standardized `ContentListItem` format.
- **Starred terminology** - UI uses "starred"; service layer uses "favorites".

### Package Architecture

```
@kbn/content-list-provider         (base state management + hooks)
         │
         ├── @kbn/content-list-provider-client (TableListView migrations)
         │      └── createFindItemsAdapter (client-side caching)
         │
         └── @kbn/content-list-provider-server (new implementations)
                └── createSearchItemsStrategy (/list endpoint)

    ┌────┼────┬────┬────┐
    ↓    ↓    ↓    ↓    ↓
  table grid toolbar docs mock-data
```

---

## Phase 1: Core Provider & State Management (Complete)

**Packages:**
- `@kbn/content-list-provider` - Base provider and hooks.
- `@kbn/content-list-provider-client` - Client-side Kibana provider.
- `@kbn/content-list-provider-server` - Server-side Kibana provider.

### Components

1. **Provider Components:**
   - `ContentListClientKibanaProvider` - Wraps existing `findItems` with client-side processing.
   - `ContentListServerKibanaProvider` - Uses `/internal/content_management/list` endpoint.
   - `ContentListProvider` - Base provider for tests and Storybook.

2. **Feature-Specific Hooks:**
   - `useContentListConfig()` - Access configuration and `supports` flags.
   - `useContentListItems()` - Items, loading state, error, refetch.
   - `useContentListSearch()` - Search query management.
   - `useContentListFilters()` - Filter state management (including `starredOnly`).
   - `useContentListSort()` - Sort field and direction.
   - `useContentListPagination()` - Page index and size.
   - `useContentListSelection()` - Selection state and actions.
   - `useFilterDisplay()` - Filter UI visibility logic.

3. **State Management:**
   - Reducer-based state with React Query for data fetching.
   - Automatic page reset on search/filter/sort changes.
   - Request cancellation for stale requests.
   - Caching via React Query.
   - **Client-side caching** - Avoids re-fetches on sort/page changes.

4. **Feature Configuration:**
   - `features.search` - Search with placeholder and initial query.
   - `features.sorting` - Sort fields and initial sort.
   - `features.pagination` - Page size options.
   - `features.selection` - Bulk action handlers (`onSelectionDelete`).
   - `features.globalActions` - Create button.
   - `features.contentEditor` - Metadata editing flyout.
   - `features.favorites` / `features.tags` - Enable service-based features.

5. **Datasource Transform:**
   - `defaultTransform` for `UserContentCommonSchema`.
   - Custom transform support for other types.

6. **Filter Resolution:**
   - **Client provider**: Resolves usernames to UIDs using cached profiles.
   - **Server provider**: Full resolution via server-side profile lookup.
   - **`no-user` filter**: Supports filtering for items without creators.
   - **`is:starred` filter**: Filters to user's starred items.

---

## Phase 2: Basic Rendering Components (Complete)

### `@kbn/content-list-table`

Table component with declarative column configuration.

**Namespace Components:**
- `Column.Name` - Title, description, starred button, tags with link support.
- `Column.UpdatedAt` - Formatted timestamp.
- `Column.CreatedBy` - User profile with avatar.
- `Column.Actions` - Row actions menu.

**Action Components:**
- `Action.ViewDetails` - Open details flyout.
- `Action.Edit` - Edit item.
- `Action.Delete` - Delete with confirmation.

**Empty States:**
- `NoItemsEmptyState` - First-time use.
- `NoResultsEmptyState` - No search results.
- `ErrorEmptyState` - Error display.

**Usage:**
```tsx
const { Column, Action } = ContentListTable;

<ContentListTable>
  <Column.Name showTags />
  <Column.UpdatedAt />
  <Column.Actions>
    <Action.Edit />
    <Action.Delete />
  </Column.Actions>
</ContentListTable>
```

### `@kbn/content-list-toolbar`

Toolbar with search, filters, and selection actions.

**Components:**
- `ContentListToolbar` - Main container with smart defaults.

**Filter Markers:**
- Sort filter - Sort field and direction.
- Tags filter - Tag include/exclude.
- Created by filter - User filter with profiles.
- Starred filter - `is:starred` toggle.

### `@kbn/content-list-grid`

Grid/card layout for visual content.

**Components:**
- `ContentListGrid` - Grid container.
- `ContentListCard` - Individual card with icon, title, description.
- `ViewModeToggle` - Switch between table and grid.

**Card Layout:**
- Tags displayed bottom-left.
- Starred button displayed bottom-right.

### `@kbn/content-list-footer` (Planned)

Standalone footer component for pagination and metadata.

> **Note:** Pagination is currently integrated into `ContentListTable`. A standalone footer package is planned for future phases.

---

## Phase 3: Core Features

Features required for feature parity with `TableListView`.

### 3.1: Empty State Variations

Components auto-detect empty state variant:
- **No items** - First-time use, show create action.
- **No results** - Search/filter returned nothing, offer to clear.
- **Error** - Something went wrong, offer retry.

### 3.2: Analytics & Telemetry Hooks

Provider includes analytics callbacks:
- Item views and clicks.
- Search queries.
- Filter changes.
- Sort changes.
- Bulk actions.

---

## Phase 4: Quality & Polish

Features to address after core functionality is complete.

### 4.1: Responsive Design

Components adapt to screen size:
- Stack toolbar elements vertically on small screens.
- Hide less important columns in table.
- Adjust grid columns for mobile.

### 4.2: Accessibility

Full a11y support:
- Keyboard navigation for all interactions.
- Screen reader announcements.
- ARIA labels for all controls.
- Focus management in modals.

---

## Phase 5: Integration Features

Features requiring additional Kibana service integration.

### 5.1: Recently Accessed Integration

Provider integrates with Kibana recently accessed service:
- Automatically adds "Recently accessed" to sort options.
- Sorts items by access timestamp.
- Optional `add()` method to track new accesses.

**Dependencies:** Requires integration with `recentlyAccessed` service from Kibana core.

---

## Phase 6: Experimental Features

Future enhancements to explore after core features and migrations are complete.

### 6.1: Grid Layout Enhancements

Extended `ContentListGrid` capabilities:
- Custom item rendering via render prop.
- Responsive column configuration.
- Card selection and bulk actions.

### 6.2: Custom Bulk Actions

Extended `ContentListToolbar.SelectionActions`:
- Configurable action buttons beyond delete/export.
- Icon and color customization.
- Conditional enabling/disabling per item.
- Confirmation dialog support.

### 6.3: Preview Popovers

Table supports preview popover on hover:
- Hover or click trigger options.
- Custom render function for preview content.
- Configurable size and position.
- Debounced hover to prevent flicker.

---

## Phase 7: Page Wrapper & Layout

### `@kbn/content-list-page`

Optional page-level wrapper using KibanaPageTemplate patterns.

**Components:**
- `ContentListPage` - Page container.
- `ContentListPage.Header` - Page header slot.
- `ContentListPage.Section` - Content area slot.
- `Header` - Title, description, actions, tabs.
- `Header.Right` - Right-side action slot.
- `Header.Bottom` - Bottom content slot.
- `Header.Tab` - Tab definition with content.

**Tab State Management:**
- Automatic internal state management.
- URL sync (`?tab=<id>`).
- Access via `useContentListPage()` hook.

**Usage:**
```tsx
<ContentListPage>
  <ContentListPage.Header>
    <Header title="Dashboards">
      <Header.Right>
        <EuiButton onClick={create}>Create</EuiButton>
      </Header.Right>
    </Header>
  </ContentListPage.Header>
  
  <ContentListPage.Section>
    <ContentListProvider {...props}>
      <ContentListToolbar />
      <ContentListTable />
      <ContentListFooter />
    </ContentListProvider>
  </ContentListPage.Section>
</ContentListPage>
```

### `@kbn/content-list`

Barrel export package for convenience:

```tsx
import {
  ContentListProvider,
  ContentListTable,
  ContentListToolbar,
  ContentListGrid,
  ContentListFooter,
  ContentListPage,
} from '@kbn/content-list';
```

---

## Phase 8: Migration Support

### Migration Guide Documentation

Migration guides covering:
- Quick reference table mapping old props to new.
- Step-by-step migration for each consumer type.
- Before/after code examples.

### Codemods

Automated migration for simple cases:
- Simple prop mappings.
- Feature-based prop conversion.
- Basic composition patterns.

### Compatibility Layer

Optional backwards compatibility wrapper:
- Maps old props to new structure.
- Deprecation warnings.
- Emergency rollback support.

### Testing Utilities

Helpers for testing migrations:
- `renderContentList()` - Test wrapper.
- `mockDataSource()` - Mock data helper.
- Provider wrappers for hooks testing.

---

## Phase 9: Consumer Migrations

### Migration Order (by complexity)

1. **Maps** - Minimal customization.
2. **Graph** - Custom empty prompt.
3. **Event Annotations** - Direct table usage.
4. **Files Management** - Embedded + custom actions.
5. **Visualizations** - Tabbed + custom columns.
6. **Dashboard** - All features + editor.

### Migration Process

1. **Analysis** - Review current implementation, identify customizations.
2. **Implementation** - Update list component, migrate custom features.
3. **Testing** - Unit tests, integration tests, manual QA.
4. **Review** - Code review, team approval, documentation updates.
5. **Deployment** - Staging, smoke tests, production, monitoring.

---

## Testing Strategy

### Unit Testing

- All components: >85% coverage.
- Hooks: >90% coverage.
- Utilities: >95% coverage.

### Integration Testing

- Full listing flow (load, search, filter, select, delete).
- URL state synchronization.
- Service integration (tags, user profiles, favorites).

### Visual Regression Testing

- All component variations.
- Empty, loading, error states.
- Responsive layouts.

### Performance Testing

- Initial render time.
- Re-render performance.
- Bundle size.
- Large list performance (1000+ items).

### Accessibility Testing

- Keyboard navigation.
- Screen reader support.
- Color contrast.
- Touch targets.

---

## Risk Management

### Risk 1: Migration Burden

**Impact:** High | **Probability:** Medium

**Mitigation:**
- Maintain old components during transition.
- Provide codemods for simple cases.
- Offer hands-on migration support.
- Compatibility layer for emergency rollback.

### Risk 2: Performance Regression

**Impact:** High | **Probability:** Low

**Mitigation:**
- Benchmark all new components vs old.
- Performance tests in CI.
- Monitor bundle size continuously.
- Load test with 1000+ items.

### Risk 3: API Complexity

**Impact:** Medium | **Probability:** Medium

**Mitigation:**
- Sensible defaults for common cases.
- Progressive enhancement pattern.
- Comprehensive examples.
- Gather feedback early.

### Risk 4: Breaking Changes

**Impact:** High | **Probability:** Low during migration

**Mitigation:**
- Semantic versioning.
- Long deprecation window.
- Clear migration paths.
- Community feedback period.

### Risk 5: Adoption Resistance

**Impact:** Medium | **Probability:** Medium

**Mitigation:**
- Start with high-value migrations.
- Demonstrate clear benefits.
- Collect and act on feedback.
- Success stories and testimonials.

### Risk 6: Scope Creep

**Impact:** Medium | **Probability:** High

**Mitigation:**
- Clear phase boundaries.
- Resist adding new features during development.
- Focus on feature parity first.
- Regular scope reviews.

---

## Appendix

### Related Documents

- **[proposals/PROPOSAL_CONTENT_LIST_PAGE.md](./proposals/PROPOSAL_CONTENT_LIST_PAGE.md)** - Architecture proposal.
- **[reference/CURRENT_USAGE.md](./reference/CURRENT_USAGE.md)** - TableListView analysis.
- **[reference/CURRENT_FEATURES.md](./reference/CURRENT_FEATURES.md)** - Feature inventory.
- **[reference/CURRENT_IMPL.md](./reference/CURRENT_IMPL.md)** - Technical implementation details.
- **[reference/ANALYSIS_DEFAULTS.md](./reference/ANALYSIS_DEFAULTS.md)** - Feature defaults strategy.
- **[reference/ANALYSIS_HEADLESS.md](./reference/ANALYSIS_HEADLESS.md)** - Architecture decision rationale.

### Architecture Decisions

1. **Component-based** - Provider with composable UI components.
2. **Features configurable** - Search, sorting, filtering, pagination via `features` prop.
3. **Feature-based API** - `features={{ search: true }}` over scattered boolean flags.
4. **Compound components** - `<Header.Right>` over `rightSlot` props.
5. **Smart defaults** - Components auto-render based on provider config.
6. **Separate content editor** - Not part of listing, integrated via hook.

### Resources

- **EUI Documentation:** https://eui.elastic.co/
- **Kibana Plugin Development:** https://www.elastic.co/guide/en/kibana/current/development.html
- **React Compound Components:** https://kentcdodds.com/blog/compound-components-with-react-hooks
