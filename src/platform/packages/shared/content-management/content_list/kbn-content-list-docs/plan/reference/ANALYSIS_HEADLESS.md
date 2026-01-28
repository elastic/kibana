# Headless Architecture Analysis

## Document Purpose

This document analyzes whether the ContentList architecture should adopt a "headless" pattern (separating logic from UI) and documents the decision rationale.

**Related Documents:**
- **[LISTING_PROVIDER.md](../LISTING_PROVIDER.md)** - Provider implementation details
- **[LISTING_COMPONENT.md](../LISTING_COMPONENT.md)** - Component specifications
- **[proposals/PROPOSAL_CONTENT_LIST_PAGE.md](../proposals/PROPOSAL_CONTENT_LIST_PAGE.md)** - Architecture proposal

---

## Question
Should the ContentListPage architecture adopt a "headless" pattern (separating logic from UI)?

## What is a Headless Component?

Headless components separate:
- **Logic layer**: State management, data fetching, business rules (exposed via hooks)
- **Presentation layer**: UI components that consume the logic

**Examples:** TanStack Table (React Table v8), Downshift, React Hook Form

```tsx
// Typical headless pattern
const { items, isLoading, search, filters, sort } = useContentList(config);

// Build completely custom UI
return (
  <MyCustomTable>
    {items.map(item => <MyRow key={item.id} {...item} />)}
  </MyCustomTable>
);
```

---

## Evidence from Current Usage Patterns

### Usage Pattern Analysis

Looking at the 6 consumers in [CURRENT_USAGE.md](./CURRENT_USAGE.md):

| Consumer | UI Customization Need | Logic Customization Need |
|----------|----------------------|-------------------------|
| **Dashboard** | Default table UI is fine | Custom validators, recently accessed logic |
| **Visualizations** | Custom table styling, tabs | Custom sort logic, query parsing |
| **Maps** | Default UI is perfect | Minimal customization |
| **Graph** | Default UI + custom empty state | URL param initialization |
| **Files** | Custom columns, no page template | Custom actions, file-kind logic |
| **Annotations** | Custom columns, no page template | Standard logic |

### Key Observations:

1. **No one needs a completely different UI paradigm**
   - All consumers use table-based layouts
   - Customizations are about columns, actions, layout—not replacing the table entirely
   - No consumer wants cards, grids, or alternate visualizations

2. **Logic customization is mostly configuration**
   - Custom validators → can be passed as callbacks
   - Custom sort options → can be configuration
   - Recently accessed → can be feature toggle
   - URL params → can be controlled externally

3. **The real pain points are about composition, not separation**
   - "Limited to 2 additional actions" → solved by compound components
   - "Can't customize toolbar layout" → solved by composable toolbar
   - "Custom CSS injection" → solved by exposing column renderers
   - "Can't add content between elements" → solved by content slots

---

## Headless Approach Options

### Option 1: Pure Headless (TanStack Table style)

**API:**
```tsx
const contentListing = useContentList({
  entityName: 'dashboard',
  dataSource: { findItems },
  search: true,
  sorting: true,
});

// Expose everything, build everything
const {
  // Data
  items,
  totalItems,
  isLoading,
  error,
  
  // Search
  searchQuery,
  setSearchQuery,
  searchError,
  
  // Filters
  activeFilters,
  setTagFilter,
  setUserFilter,
  setFavoritesFilter,
  clearFilters,
  
  // Sorting
  sortField,
  sortDirection,
  setSorting,
  
  // Pagination
  pageIndex,
  pageSize,
  setPageIndex,
  setPageSize,
  
  // Selection
  selectedItems,
  selectItem,
  selectAll,
  clearSelection,
  
  // Actions
  deleteItems,
  canDeleteSelected,
} = contentListing;

return (
  <MyCustomUI>
    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
    {/* Build everything from scratch */}
  </MyCustomUI>
);
```

**Pros:**
- Maximum flexibility
- Logic is testable in isolation
- Could theoretically build non-table UIs

**Cons:**
- **Massive API surface** - 20+ methods/values to understand
- **High learning curve** - every team rebuilds basic UI
- **No one needs this level of flexibility** - all consumers want tables
- **More maintenance** - now supporting 2 APIs (hooks + components)
- **Harder to discover** - which hook do I use? How do they compose?
- **Duplicated effort** - every team rebuilds search box, filters, pagination

### Option 2: Hybrid (Context + Hooks)

**API:**
```tsx
// Default: Use pre-built components (80% of cases)
<ContentListProvider {...config}>
  <ContentList.Toolbar>
    <Toolbar.SearchBox />
    <Toolbar.Filters />
  </ContentList.Toolbar>
  <ContentList.Table />
</ContentListProvider>

// Power users: Access state via hooks (20% of cases)
<ContentListProvider {...config}>
  <MyCustomToolbar />
  <ContentList.Table />
</ContentListProvider>

function MyCustomToolbar() {
  const { searchQuery, setSearchQuery, activeFilters } = useContentListState();
  return <MyBrandToolbar {...} />;
}
```

**Pros:**
- **Simple default path** - use components
- **Escape hatch available** - use hooks when needed
- **Gradual adoption** - start with components, drop to hooks if needed
- **Smaller API** - components hide complexity for common cases

**Cons:**
- Still maintaining two APIs
- Context hook could become large
- Might tempt teams to over-customize

### Option 3: Component-Only (Current Proposal)

**API:**
```tsx
<ContentListProvider {...config}>
  <ContentList.Toolbar>
    <Toolbar.SearchBox />
    <Toolbar.Filters>
      <Filters.SortSelect />
      <Filters.TagFilter />
      <MyCustomFilter /> {/* Custom filter component */}
    </Toolbar.Filters>
  </ContentList.Toolbar>
  <ContentList.Table 
    columns={[...defaultColumns, myCustomColumn]}
  />
</ContentListProvider>
```

**Pros:**
- **Single, cohesive API** - everything is components
- **Easy to discover** - TypeScript autocomplete shows all options
- **Pre-built solutions** - search, filters, pagination provided
- **Composable** - mix built-in and custom components
- **Meets all known use cases** - based on actual consumer analysis

**Cons:**
- Less flexibility than pure headless
- Can't build completely custom UIs (but no one needs this)

---

## Recommendation: Enhanced Component-Only (Option 3+)

Based on the evidence, I recommend **sticking with the component-based approach** but adding **limited, targeted hooks** for specific power-user scenarios.

### Why?

1. **No consumer needs a completely different UI**
   - All 6 consumers use table layouts
   - Customization needs are about arrangement, not paradigm shift
   - Compound components solve the layout problems

2. **The pain points are solved by composition**
   - "Can't add unlimited actions" → `<Header.Right>` accepts any number
   - "Can't customize toolbar" → Full override with `Toolbar.*` sub-components
   - "Custom columns" → Pass to `<ContentList.Table columns={...}>`
   - "Custom filters" → Add to `<Toolbar.Filters>` or provide children

3. **Headless would add complexity without solving real problems**
   - No consumer asked for "build my own table"
   - They asked for "let me customize this table"
   - Big difference in scope

### What to Add: Targeted Hooks

Instead of full headless, expose **specific hooks for power-user scenarios**:

```tsx
// 1. Access state for custom components
function MyCustomFilter() {
  const { items, activeFilters, setFilter } = useContentListState();
  return <MyUI />;
}

// 2. Imperative actions for integration
function MyExternalButton() {
  const { refreshItems, clearFilters } = useContentListActions();
  return <button onClick={() => { clearFilters(); refreshItems(); }}>Reset</button>;
}

// 3. Derived data for custom displays
function MyCustomStats() {
  const { state } = useContentListState();
  const { selectedCount } = useContentListSelection();
  return <div>{state.items.length} of {state.totalItems} items ({selectedCount} selected)</div>;
}
```

**Benefits:**
- **Small API** - 3 focused hooks instead of 20+ methods
- **Clear use cases** - custom components, external integration, derived data
- **Doesn't break simple cases** - components still work out of box
- **Solves real problems**:
  - Visualizations can build custom stats display
  - Dashboard can integrate with external controls
  - Files can show custom file-kind metrics

---

## Alternative: If We Went Fully Headless

If we later discover consumers need completely custom UIs (e.g., kanban boards, card grids), we could:

### Phase 1: Extract core logic
```tsx
// New package: @kbn/content-list-headless
export function useContentList(config) { /* pure logic */ }
```

### Phase 2: Build components on top
```tsx
// Existing package: @kbn/content-list
import { useContentList } from '@kbn/content-list-headless';

export function ContentListProvider({ children, ...config }) {
  const state = useContentList(config);
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
```

### Phase 3: Deprecation path
- Keep component API stable
- Add headless hooks for new use cases
- Migrate gradually over time

---

## Conclusion

**Don't go headless now.** The evidence shows:

1. **Compound components solve the real pain points** (layout, customization, unlimited slots)
2. **No consumer needs a different UI paradigm** (all want tables with tweaks)
3. **Headless adds complexity** without solving current problems
4. **We can add it later** if use cases emerge (extract logic, keep component API)

**Do add targeted hooks** for power users:
- `useContentListState()` - access state and config for custom components  
- `useContentListActions()` - imperative actions for integration
- `useContentListSelection()` - selection management and derived data

This gives **90% of headless benefits** with **10% of the complexity**, while meeting all known use cases.

---

## Decision Matrix

| Factor | Pure Headless | Hybrid | Component-Only | Component + Targeted Hooks |
|--------|--------------|---------|----------------|---------------------------|
| **Meets current needs** | Good | Good | Good | Excellent |
| **Ease of use** | Poor | Fair | Excellent | Excellent |
| **Flexibility** | Excellent | Excellent | Good | Excellent |
| **API simplicity** | Poor | Fair | Excellent | Good |
| **Maintenance burden** | Poor | Fair | Excellent | Good |
| **Learning curve** | Poor | Fair | Excellent | Good |
| **TypeScript DX** | Fair | Fair | Excellent | Excellent |
| **Power user escape hatch** | Excellent | Excellent | Poor | Excellent |
| **Future-proof** | Excellent | Good | Fair | Excellent |

**Winner: Component-Only + Targeted Hooks**

Balances simplicity for common cases with flexibility for power users, without the maintenance burden of a full headless architecture.

