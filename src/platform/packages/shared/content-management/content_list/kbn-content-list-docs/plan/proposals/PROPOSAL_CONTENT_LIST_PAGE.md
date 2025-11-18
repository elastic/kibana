# ContentListPage Architecture Proposal

## Document Purpose

This document presents the architectural proposal for refactoring `TableListView` into the composable `ContentList` system. It explains the design principles, rationale for key decisions, and expected benefits.

**Related Documents:**
- **[PLAN.md](../PLAN.md)** - Implementation phases and schedule
- **[LISTING_COMPONENT.md](../LISTING_COMPONENT.md)** - Component specifications
- **[LISTING_PROVIDER.md](../LISTING_PROVIDER.md)** - Provider implementation guide
- **[LISTING_PAGE.md](../LISTING_PAGE.md)** - Page wrapper specification
- **[RECIPES.md](../RECIPES.md)** - Usage examples and migrations

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Proposed Architecture](#proposed-architecture)
   - [Design Principles](#design-principles)
   - [Component Hierarchy](#component-hierarchy)
3. [Architecture Components](#architecture-components)
   - [ContentListPage](../LISTING_PAGE.md) - Optional page wrapper
   - [ContentListProvider](../LISTING_COMPONENT.md) - Core list components
   - [Quick Start Examples](#quick-start-examples)
4. [Migration Examples for Current Consumers](#migration-examples-for-current-consumers)
   - Four representative migrations: Maps, Files, Dashboard, Visualizations
5. [Usage Examples](#usage-examples)
6. [Benefits](#benefits)
7. [Risk Mitigation](#risk-mitigation)
8. [Technical Debt Addressed](#technical-debt-addressed)
9. [Conclusion](#conclusion)

**Detailed Documentation:**
- **[LISTING_PAGE.md](../LISTING_PAGE.md)** - Complete ContentListPage component specification
- **[LISTING_COMPONENT.md](../LISTING_COMPONENT.md)** - Complete ContentListProvider & list components specification
- **[CURRENT_USAGE.md](../reference/CURRENT_USAGE.md)** - Analysis of existing TableListView implementation
- **[ANALYSIS_DEFAULTS.md](../reference/ANALYSIS_DEFAULTS.md)** - Feature defaults and uiSettings integration strategy
- **[ANALYSIS_HEADLESS.md](../reference/ANALYSIS_HEADLESS.md)** - Headless component analysis and decision rationale

---

## Executive Summary

The current `TableListView` component has become a bottleneck for teams across Kibana. Its sprawling monolithic architecture, limited customization options, and tight coupling make it difficult for teams to adapt to their specific needs. This proposal outlines a plan to refactor it into a composable `ContentListPage` system built on smaller, focused sub-components that teams can mix and match to their requirements.

In addition to improving the architecture, this refactoring addresses specific team requirements documented in [#159995](https://github.com/elastic/kibana/issues/159995), adding three new capabilities: initial filter state (Security team), preview popovers (Visualisation team), and analytics hooks (Content Management team).

**For detailed analysis of the current implementation, see [CURRENT_USAGE.md](../reference/CURRENT_USAGE.md)**  
> This includes: architecture overview, complete functionality inventory (27 end-user features), key problems, and usage patterns across 6 consumers.

## Proposed Architecture

### Design Principles

1. **Composition over Configuration**: Build UIs by composing small components rather than passing 30+ props
2. **Feature-Based Organization**: Related functionality grouped into feature objects (e.g., `search`, `sorting`, `filtering`)
   - Pass `true` to enable with defaults
   - Pass an object to enable with custom configuration
   - Omit to disable the feature
   - Explicit and self-documenting
   - No boolean flags scattered across the API
3. **Compound Components for Layout**: Use named child slots instead of prop arrays
   - `<Header.Right>` instead of `rightSideItems={[]}`
   - Compose with sub-components instead of prop-based configuration
   - More flexible, unlimited items, better TypeScript
   - Standard React pattern (similar to EUI Tabs, Accordion, etc.)
4. **Smart Defaults - Zero-Config Where Possible**: Components render sensible defaults when no children provided
   - `<ContentListToolbar />` → Auto-renders SearchBox, Filters, BulkActions based on enabled features
   - `<Toolbar.Filters />` → Auto-renders all configured filter types
   - `<ContentListFooter />` → Auto-renders Pagination if enabled
   - Providing children overrides the smart default for full control
   - Dramatically reduces boilerplate for standard use cases
5. **Sensible Defaults at Every Level**: Common use cases work out of the box
   - Consumers pass user preferences from uiSettings (pagination, limits, etc.)
   - Feature-specific defaults when `true` is passed
   - Smart component defaults eliminate most manual composition
6. **Progressive Enhancement**: Easy to start simple, easy to customize deeper
7. **Separation of Concerns**: Each component has a single, clear responsibility
8. **Flexible Layout**: Not tied to page templates or specific layouts
9. **Explicit Dependencies**: Context for shared state, props for configuration

**Why Compound Components over Named Slot Props?**

We considered using named props (`rightSlot={...}`) but chose compound components for:
- **No arbitrary limits** - Old API limited to 2 actions, compound components unlimited
- **Better readability** - Structure visible in JSX tree
- **Familiar pattern** - Matches EUI and other React libraries
- **Easier extension** - Add new slots without changing prop interfaces
- **Flexible composition** - Mix and match any content naturally
- **Smart defaults** - Omit a slot, get sensible default rendering

```tsx
// Compound component pattern (chosen approach)
<Header title="Dashboards">
  <Header.Right>
    <EuiButton>Action 1</EuiButton>
    <EuiButton>Action 2</EuiButton>
    <CustomComponent />
  </Header.Right>
  {/* Bottom slot omitted - no bottom content renders (sensible default) */}
</Header>
```

**How Smart Defaults Work:**

```tsx
// ZERO CONFIG: Components auto-render based on provider features
<ContentListProvider
  search={true}
  sorting={true}
  filtering={{ tags: true, users: true }}
  actions={{
    selection: { onDelete },
  }}
  pagination={true}
  {...}
>
  <ContentListToolbar />  {/* Auto-renders: SearchBox, Filters (Sort, Tags, Users), BulkActions */}
  <ContentListTable />
  <ContentListFooter />   {/* Auto-renders: Pagination */}
</ContentListProvider>

// EXPLICIT: Override defaults with custom structure
<ContentListToolbar>
  <Toolbar.SearchBox />
  <Toolbar.Filters>
    <Filters.SortSelect />
    <Filters.TagFilter />
  </Toolbar.Filters>
  <Toolbar.Button iconType="inspect" onClick={handleDiagnostics}>
    Diagnostics
  </Toolbar.Button>
  <Toolbar.BulkActions />
</ContentListToolbar>

// ADVANCED: Custom positioning with EuiFlexGroup
<ContentListToolbar>
  <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" alignItems="center">
    <EuiFlexItem grow={false}>
      <Toolbar.SearchBox />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <Toolbar.Button onClick={handleExport}>Export</Toolbar.Button>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <Toolbar.BulkActions />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  </EuiFlexGroup>
</ContentListToolbar>
```

**Default Rendering Rules:**
- **No children** → Renders smart default based on provider config
- **Children provided** → Full override; you compose with sub-components as needed

### Component Hierarchy

```
ContentListPage (optional layout wrapper)
├── ContentListPage.Header
│   └── Header (title, description, actions, tabs)
│       ├── Header.Right (action buttons)
│       ├── Header.Bottom (bottom content)
│       └── Header.Tab (tab definitions)
└── ContentListPage.Section
    └── ContentListProvider (state management context)
        ├── ContentListToolbar
        │   ├── Toolbar.SearchBox
        │   ├── Toolbar.Filters
        │   │   ├── Filters.SortSelect
        │   │   ├── Filters.TagFilter
        │   │   ├── Filters.UserFilter
        │   │   ├── Filters.FavoritesFilter
        │   │   └── [Custom filters...]
        │   ├── Toolbar.BulkActions
        │   └── Toolbar.Button (convenience wrapper)
        ├── ContentListTable (table renderer)
        ├── ContentListGrid (grid renderer)
        ├── ContentListFooter
        │   ├── Footer.Pagination
        │   └── [Custom footer content...]
        └── Modals
            ├── DeleteModal
            └── [Editor modals...]
```

### Package Structure

The new architecture is implemented as a multi-package system (10 packages: 9 focused packages + 1 barrel export) for better tree-shaking and clear boundaries:

- **`@kbn/content-list`** - Main barrel package, re-exports all components
- **`@kbn/content-list-provider`** - Core state management and context
- **`@kbn/content-list-table`** - Table view component
- **`@kbn/content-list-grid`** - Grid view component
- **`@kbn/content-list-toolbar`** - Toolbar and search components
- **`@kbn/content-list-filters`** - Filter components
- **`@kbn/content-list-footer`** - Footer and pagination
- **`@kbn/content-list-modals`** - Delete and confirmation modals
- **`@kbn/content-list-page`** - Optional page wrapper
- **`@kbn/content-list-services`** - Utility functions and services

Consumers can import from the main barrel package for convenience, or import specific packages for optimal bundle size. See [PLAN.md](../PLAN.md) for detailed package architecture and implementation plan.

## Architecture Components

The new architecture consists of two main layers:

### 1. **ContentListPage** - Optional Page Wrapper

An optional layout wrapper that provides consistent page structure using `KibanaPageTemplate` patterns.

**Key Features:**
- Header with tabs support (state managed automatically)
- Breadcrumbs integration
- Flexible content slots
- Fully optional - use `ContentListProvider` directly if you don't need it

**Complete specification: [LISTING_PAGE.md](../LISTING_PAGE.md)**

---

### 2. **ContentListProvider** - Core Listing Components

The heart of the system - provides state management and all listing functionality.

**Key Features:**
- Feature-based configuration API (`search={true}`, `sorting={{ options }}`, etc.)
- Compound components for flexible composition
- Read-only mode (`isReadOnly` prop)
- Extensive hooks for customization

**Component Library:**
- `ContentListProvider` - Central state provider
- `ContentListToolbar` - Search, filters, bulk actions
- `ContentListTable` - Table rendering
- `ContentListGrid` - Grid/card rendering
- `ContentListFooter` - Pagination
- Sub-components for composition: `Toolbar.*`, `Filters.*`, `Footer.*`

**Complete specification: [LISTING_COMPONENT.md](../LISTING_COMPONENT.md)**

---

## Quick Start Examples

For complete usage examples and recipes, see **[RECIPES.md](../RECIPES.md)**.

**Quick links:**
- [Simple Listing](../RECIPES.md#simple-listing)
- [Embedded Usage](../RECIPES.md#embedded-usage-no-page-wrapper)
- [Read-Only Mode](../RECIPES.md#read-only-mode)

---


## Migration Examples for Current Consumers

For detailed migration examples with before/after code, see **[RECIPES.md - Migration Examples](../RECIPES.md#migration-examples-for-current-consumers)**.

**Migration examples available:**
- [Migration 1: Maps](../RECIPES.md#migration-1-maps-simple-case) - Simple case with minimal customization
- [Migration 2: Files Management](../RECIPES.md#migration-2-files-management-embedded--custom-actions) - Embedded usage with custom actions
- [Migration 3: Dashboard](../RECIPES.md#migration-3-dashboard-complex-with-many-features) - Complex case with many features
- [Migration 4: Visualizations](../RECIPES.md#migration-4-visualizations-tabbed-variant) - Tabbed variant with content editor

The remaining consumers (Graph, Event Annotations) follow similar patterns and can use these as templates.

---

## Usage Examples

For complete usage examples and patterns, see **[RECIPES.md - Usage Patterns](../RECIPES.md#usage-patterns)**.

**Quick links:**
- [Pattern 1: Simple Listing](../RECIPES.md#pattern-1-simple-listing-default-experience)
- [Pattern 2: Grid Layout with Custom Filters](../RECIPES.md#pattern-2-grid-layout-with-custom-filters)
- [Pattern 3: Custom Table with Additional Content](../RECIPES.md#pattern-3-custom-table-with-additional-content)
- [Pattern 4: No Page Template (Embedded)](../RECIPES.md#pattern-4-no-page-template-embedded-in-management)
- [Pattern 5: Completely Custom](../RECIPES.md#pattern-5-completely-custom-maximum-flexibility)

---

## Benefits

### For Teams Consuming the Components

1. **Flexibility**: Mix and match components to build exactly what you need
2. **Easier Customization**: Override/replace individual pieces without touching the core
3. **Better Performance**: Only use and render what you need
4. **Gradual Adoption**: Start with high-level components, customize deeper as needed
5. **Type Safety**: Better TypeScript experience with focused interfaces
6. **Testing**: Easier to test individual pieces in isolation

### For Platform Team (Maintainers)

1. **Easier Maintenance**: Small, focused components with single responsibilities
2. **Better Testing**: Unit test individual components instead of integration testing everything
3. **Safer Changes**: Modifications are isolated and less likely to break consumers
4. **Documentation**: Easier to document small, focused APIs
5. **Onboarding**: New contributors can understand and modify smaller pieces
6. **Performance Optimization**: Can optimize individual components independently

### For Kibana as a Product

1. **Consistency**: Teams can share common patterns while customizing as needed
2. **Innovation**: Teams can experiment with new patterns (grid, cards) easily
3. **Accessibility**: Centralized improvements benefit all consumers
4. **Bundle Size**: Teams only bundle what they use
5. **Future-Proof**: New features can be added without breaking existing code

---

## Risk Mitigation

Key risks and mitigations (see [PLAN.md - Risk Management](../PLAN.md#risk-management) for detailed analysis with contingency plans):

| Risk | Mitigation Strategy |
|------|---------------------|
| **Migration Burden** | Maintain old components during transition; provide codemods; gradual rollout |
| **API Complexity** | Sensible defaults; progressive enhancement; comprehensive examples |
| **Performance Regression** | Benchmark against current implementation; performance testing in CI |
| **Breaking Changes** | Semantic versioning; long deprecation window; clear migration paths |
| **Adoption Resistance** | Start with high-value migrations; demonstrate clear benefits; collect feedback |
| **Scope Creep** | Clear phase boundaries; focus on feature parity first |

---

## Technical Debt Addressed

This refactoring addresses several categories of technical debt:

### Architecture Debt
- Monolithic component with too many responsibilities → Focused, single-purpose components
- Tight coupling between layers → Clear separation with well-defined interfaces
- God object anti-pattern → Composition of specialized components

### Code Quality Debt
- 1,200+ line files → <200 line components
- 30+ props per component → 5-15 props per component
- Complex reducer with 9 actions → Smaller, focused state managers
- Difficult to test integration → Easy to test units

### API Debt
- Inflexible prop-based customization → Composable component architecture
- Limited extension points → Unlimited customization via composition
- Deprecated workarounds (`withoutPageTemplateWrapper`) → Clean, intentional APIs
- Arbitrary limitations (2 header actions) → No artificial constraints

### Performance Debt
- Bundle entire component for any usage → Tree-shakable individual components
- Render unused features → Only render what's needed
- Complex re-render logic → Optimized focused components

### Maintenance Debt
- Hard to understand codebase → Self-documenting component structure
- Risky changes → Isolated, safe modifications
- Long onboarding time → Quick to understand small pieces
- Centralized bottleneck → Distributed ownership

### Documentation Debt
- Incomplete documentation → Comprehensive per-component docs
- Hard to find examples → Rich example library
- Unclear patterns → Self-evident composition patterns

---

## Conclusion

The TableListView has served Kibana well, but its monolithic design has become a bottleneck for teams. By refactoring into composable `ContentListPage` components, we can:

- **Empower teams** to build exactly what they need
- **Reduce maintenance burden** through better separation of concerns
- **Improve developer experience** with focused, well-documented APIs
- **Enable innovation** with flexible layouts and customization
- **Maintain consistency** through shared, tested components

### Impact Summary

- Major complexity reduction thanks to smaller, focused components
- Less code to maintain across provider, table, and toolbar packages
- Leaner bundles because consumers import only what they need
- Streamlined setup for complex consumers such as Dashboard
- All current consumers continue working during the transition with no planned breaking changes

### What Success Looks Like

**Short Term**
- All major consumers migrated to the new architecture
- No high-severity bugs introduced
- Broad positive feedback from partner teams
- New layout variants (grid, cards) in production
- Reduced support burden

**Long Term**
- New teams build custom listing pages quickly
- Platform team ships new features without fear of breaking consumers
- Sustained performance improvements across all listing pages
- Lower barrier to entry for new contributors

The migration will be gradual, safe, and well-supported. The new architecture will serve Kibana for years to come, enabling teams to move faster while maintaining quality and consistency.
