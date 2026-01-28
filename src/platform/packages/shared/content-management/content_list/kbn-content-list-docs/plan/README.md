# Content List Component Architecture

This directory contains planning documentation for the `ContentList` architecture, a composable replacement for the monolithic `TableListView`.

> [!NOTE]
> These are **planning documents** for the architecture and implementation. For consumer-facing API documentation, see the README files in each package.

---

## Document Map

### Where to Start

| If you want to... | Read this |
|-------------------|-----------|
| Understand the provider architecture | [LISTING_PROVIDER.md](./LISTING_PROVIDER.md) |
| Understand the implementation phases | [PLAN.md](./PLAN.md) |
| Understand when to use Client vs Server providers | [CLIENT_VS_SERVER.md](./CLIENT_VS_SERVER.md) |
| See code examples and usage patterns | [RECIPES.md](./RECIPES.md) |

### Component Specifications

| Document | Purpose |
|----------|---------|
| [LISTING_COMPONENT.md](./LISTING_COMPONENT.md) | Specifies UI components: Table, Grid, Toolbar, and their APIs. |
| [LISTING_PROVIDER.md](./LISTING_PROVIDER.md) | Specifies the provider: context, state management, hooks, filter syntax. |
| [CLIENT_VS_SERVER.md](./CLIENT_VS_SERVER.md) | When to use Client vs Server providers. |

### Architecture Decisions

| Document | Purpose |
|----------|---------|
| [reference/ANALYSIS_DEFAULTS.md](./reference/ANALYSIS_DEFAULTS.md) | Analyzes which features can use `true` for defaults vs requiring config. |
| [reference/ANALYSIS_HEADLESS.md](./reference/ANALYSIS_HEADLESS.md) | Documents the decision to use component-based vs headless architecture. |

### Reference Material

Analysis of the existing `TableListView` that informs the new design:

| Document | Purpose |
|----------|---------|
| [reference/CURRENT_USAGE.md](./reference/CURRENT_USAGE.md) | Analyzes where and how TableListView is used. |
| [reference/CURRENT_FEATURES.md](./reference/CURRENT_FEATURES.md) | Complete inventory of end-user features. |
| [reference/CURRENT_IMPL.md](./reference/CURRENT_IMPL.md) | Technical implementation details. |

### Proposals

| Document | Purpose |
|----------|---------|
| [proposals/PROPOSAL_CONTENT_LIST_PAGE.md](./proposals/PROPOSAL_CONTENT_LIST_PAGE.md) | Architecture proposal with design principles and rationale. |
| [proposals/PROPOSAL_CREATOR.md](./proposals/PROPOSAL_CREATOR.md) | Proposal for creator column integration (implemented). |

---

## Package Structure

The ContentList architecture is organized into multiple packages within `content_list/`:

```
content_list/
├── kbn-content-list-docs/            # Planning docs + Storybook stories
├── kbn-content-list-provider/        # Base state management and hooks
├── kbn-content-list-provider-client/ # Client-side Kibana provider (TableListView migrations)
├── kbn-content-list-provider-server/ # Server-side Kibana provider (new implementations)
├── kbn-content-list-table/           # Table view component
├── kbn-content-list-toolbar/         # Toolbar (search, filters)
├── kbn-content-list-grid/            # Grid view component with ViewModeToggle
└── kbn-content-list-mock-data/       # Test utilities and mock data
```

---

## Quick Start Examples

### Client Provider (Migrating from TableListView)

```tsx
import { ContentListClientKibanaProvider } from '@kbn/content-list-provider-client';
import { ContentListTable } from '@kbn/content-list-table';
import { ContentListToolbar } from '@kbn/content-list-toolbar';

// Your existing findItems function - no changes needed.
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

### Server Provider (New Implementations)

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
>
  <ContentListToolbar />
  <ContentListTable />
</ContentListServerKibanaProvider>
```

For comprehensive examples, see [RECIPES.md](./RECIPES.md).

---

## Storybook Stories

Interactive examples are available in the `kbn-content-list-docs` package:

| Story | Description |
|-------|-------------|
| `minimal.stories.tsx` | Basic usage patterns. |
| `full_featured.stories.tsx` | Complete feature demonstration. |
| `grid.stories.tsx` | Grid view and ViewModeToggle. |
| `content_editor.stories.tsx` | Content editor flyout integration. |
| `customization.stories.tsx` | Custom columns and actions. |

---

## Related Documentation

- **Package READMEs** - Consumer API documentation in each package.
- **Storybook** - Run `yarn storybook content_management` to view interactive examples.
