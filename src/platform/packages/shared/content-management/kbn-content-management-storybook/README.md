# @kbn/content-management-storybook

Centralized Storybook configuration for the Content Management component ecosystem.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Usage](#usage)
  - [Writing Stories](#writing-stories)
  - [Using Mock Data](#using-mock-data)
- [Architecture](#architecture)
- [API](#api)
- [Troubleshooting](#troubleshooting)

## Overview

This package provides a shared Storybook configuration for all packages under `src/platform/packages/shared/content-management/`. It enables developers to build and test UI components in isolation without requiring a running Kibana backend.

The Storybook aggregates stories from sibling packages including:

- `content_editor` - Inline content editing components.
- `content_insights` - Activity and view tracking UI.
- `favorites` - Favorite/star functionality.
- `table_list_view` / `table_list_view_table` - Content listing tables.
- `tabbed_table_list_view` - Tabbed content navigation.
- `user_profiles` - Creator/updater display components.
- `access_control` - Permission and sharing UI.

## Quick Start

Run the Content Management Storybook:

```bash
yarn storybook content_management
```

Build a static Storybook site:

```bash
yarn storybook --site content_management
```

## Usage

### Writing Stories

Create stories in sibling packages using the [Component Story Format (CSF)](https://storybook.js.org/docs/api/csf). Stories are automatically discovered from any `*.stories.tsx` or `*.mdx` file within the `content-management/` directory tree.

```tsx
// Example: table_list_view_table/src/components/tag_badge.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';

import { TagBadge } from './tag_badge';

const meta: Meta<typeof TagBadge> = {
  title: 'Content Management/Tags/Tag Badge',
  component: TagBadge,
};

export default meta;
type Story = StoryObj<typeof TagBadge>;

export const Default: Story = {};

export const WithCustomProps: Story = {
  args: {
    color: '#FF5733',
    label: 'Production',
  },
};
```

### Using Mock Data

This package re-exports mock data from [`@kbn/content-list-mock-data`](../content_list/kbn-content-list-mock-data/README.md) for use in stories. Here's a complete example:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { mockFindDashboards, MOCK_TAGS } from '@kbn/content-management-storybook';

import { ContentList } from './content_list';

const meta: Meta<typeof ContentList> = {
  title: 'Content Management/Content List/ContentList',
  component: ContentList,
};

export default meta;
type Story = StoryObj<typeof ContentList>;

export const Default: Story = {
  args: {
    findItems: mockFindDashboards,
    tags: MOCK_TAGS,
  },
};

export const WithVisualizationData: Story = {
  args: {
    findItems: mockFindVisualizations,
    tags: MOCK_TAGS,
  },
};
```

For advanced mock data usage (custom `findItems`, user profiles, status sorting), see the [`@kbn/content-list-mock-data` README](../content_list/kbn-content-list-mock-data/README.md).

## Architecture

Stories are discovered from sibling packages via the `main.ts` configuration:

```
src/platform/packages/shared/content-management/
├── kbn-content-management-storybook/   # This package (Storybook config)
│   ├── main.ts                         # Story discovery: ../**/*.stories.+(tsx|mdx)
│   ├── preview.ts                      # Global decorators and parameters
│   ├── manager.ts                      # UI branding and panel config
│   └── index.ts                        # Re-exports for story imports
│
├── table_list_view_table/
│   └── src/
│       └── components/
│           └── *.stories.tsx           # ← Stories here are auto-discovered
│
├── content_editor/
│   └── src/
│       └── components/
│           └── *.stories.tsx           # ← Stories here are auto-discovered
│
└── ... (other sibling packages)
```

### Configuration Files

| File | Purpose |
|------|---------|
| `main.ts` | Extends `@kbn/storybook` default config. Enables `react-docgen-typescript` for automatic prop table generation. |
| `preview.ts` | Sets global Storybook parameters. Injects `jest-mock` for stories requiring mock functions. |
| `manager.ts` | Customizes the Storybook UI with Content Management branding and default panel settings. |
| `constants.ts` | Centralized `TITLE` and `URL` constants for branding. |

## API

### Configuration Exports

| Export | Type | Description |
|--------|------|-------------|
| `TITLE` | `string` | Storybook title: `'Content Management Storybook'`. |
| `URL` | `string` | GitHub URL for the content-management directory. |

### Mock Data Re-exports

All exports from `@kbn/content-list-mock-data` are available from this package:

| Export | Description |
|--------|-------------|
| `mockFindDashboards` | Pre-configured `findItems` for dashboard content. |
| `mockFindMaps` | Pre-configured `findItems` for map content. |
| `mockFindFiles` | Pre-configured `findItems` for file content. |
| `mockFindVisualizations` | Pre-configured `findItems` for visualization content. |
| `MOCK_DASHBOARDS` | Array of 10 dashboard mock items spanning the name-cell `title × description × tag count` permutation matrix. |
| `MOCK_VISUALIZATIONS` | Array of 8 visualization mock items spanning the name-cell permutation matrix and a variety of `visType`s. |
| `MOCK_MAPS` | Array of 5 map mock items spanning the name-cell permutation matrix within a 5-item budget. |
| `MOCK_FILES` | Array of 6 file mock items spanning the name-cell `title × description` matrix (no inline tags in the Files story). |
| `MOCK_TAGS` | Array of 8 tag items. |
| `MOCK_USER_PROFILES` | Array of user profile objects. |
| `MOCK_USER_PROFILES_MAP` | Map of user UIDs to profile objects. |
| `createMockFindItems` | Factory for custom `findItems` implementations. |
| `createSimpleMockFindItems` | Simplified factory with optional delay. |

For complete type definitions and advanced usage, see the [`@kbn/content-list-mock-data` API documentation](../content_list/kbn-content-list-mock-data/README.md#api).

## Troubleshooting

### Jest Mock Availability

The `preview.ts` file injects `jest-mock` onto `window.jest` to support stories that use Jest mock functions. This is a workaround because Storybook runs in a browser environment where Jest is not available.

If you encounter errors like `jest is not defined` in your story, ensure your story file imports mocks from this package or `@kbn/content-list-mock-data` rather than calling `jest.fn()` directly.

```tsx
// ❌ Won't work in Storybook
const mockFn = jest.fn();

// ✅ Use the injected jest-mock
import jest from 'jest-mock';
const mockFn = jest.fn();

// ✅ Or use pre-built mocks from this package
import { mockFindDashboards } from '@kbn/content-management-storybook';
```

### Stories Not Appearing

If your stories don't appear in Storybook:

1. Ensure the file ends with `.stories.tsx` or `.mdx`.
2. Verify the file is within the `content-management/` directory tree.
3. Check that the story has a valid default export with `meta` configuration.
4. Restart the Storybook dev server after adding new story files.
