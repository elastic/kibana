# @kbn/content-list-mock-data

Mock data and utilities for testing content management UI components in Storybook without backend dependencies.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Usage](#usage)
  - [Using Pre-configured Mock Functions](#using-pre-configured-mock-functions)
  - [Using Raw Mock Data Arrays](#using-raw-mock-data-arrays)
  - [Creating Custom Mock Functions](#creating-custom-mock-functions)
- [API](#api)
  - [Mock Data Collections](#mock-data-collections)
  - [Mock Functions](#mock-functions)
  - [User Profile Utilities](#user-profile-utilities)
  - [Types](#types)

## Overview

This package provides realistic mock data for content management components, enabling Storybook story development and component testing without requiring a running Kibana backend. It includes:

- **Mock content items**: Dashboards, visualizations, maps, files, and tags that mirror real Kibana saved object structures.
- **Mock `findItems` implementations**: Ready-to-use async functions with filtering, sorting, and pagination.
- **User profile mocks**: Simulated user data for testing creator/updater display.

The mock data is designed primarily for [`@kbn/content-list`](../kbn-content-list) component stories but can be used across the broader `@kbn/content-management-*` ecosystem.

## Quick Start

Import pre-configured mock functions for immediate use in your stories:

```typescript
import { mockFindDashboards, MOCK_TAGS } from '@kbn/content-list-mock-data';

// Use in a ContentList story
const MyStory = () => (
  <ContentList
    findItems={mockFindDashboards}
    tags={MOCK_TAGS}
    // ... other props
  />
);
```

To view the content management stories:

```bash
yarn storybook content_management
```

## Usage

### Using Pre-configured Mock Functions

The simplest approach is to use the pre-configured mock functions. These include filtering, sorting, and pagination out of the box:

```typescript
import {
  mockFindDashboards,
  mockFindMaps,
  mockFindFiles,
  mockFindVisualizations,
} from '@kbn/content-list-mock-data';

// Each function accepts the standard findItems parameters
const result = await mockFindDashboards({
  searchQuery: 'revenue',
  filters: {
    tags: { include: ['tag-production'] },
    favoritesOnly: false,
  },
  sort: { field: 'updatedAt', direction: 'desc' },
  page: { index: 0, size: 10 },
});

// Returns: { items: DashboardMockItem[], total: number }
```

### Using Raw Mock Data Arrays

For simpler scenarios or custom implementations, import the raw data arrays directly:

```typescript
import {
  MOCK_DASHBOARDS,
  MOCK_VISUALIZATIONS,
  MOCK_MAPS,
  MOCK_FILES,
  MOCK_TAGS,
} from '@kbn/content-list-mock-data';

// Use directly in tests or custom implementations
console.log(MOCK_DASHBOARDS.length); // 8 dashboard items
console.log(MOCK_TAGS.length);       // 8 tag items
```

### Creating Custom Mock Functions

For advanced scenarios, use the factory functions to create custom mock implementations:

```typescript
import {
  createMockFindItems,
  createSimpleMockFindItems,
  addStatusToItems,
  statusSortFn,
  MOCK_DASHBOARDS,
} from '@kbn/content-list-mock-data';

// Option 1: createSimpleMockFindItems - Quick setup with optional delay
const findItemsWithDelay = createSimpleMockFindItems(500); // 500ms simulated latency

// Option 2: createMockFindItems - Full control over data source and behavior
const customFindItems = createMockFindItems({
  items: addStatusToItems(MOCK_DASHBOARDS),
  delay: 200,
  statusSortFn, // Enable sorting by status field
});
```

#### User Profile Integration

Mock user profile services for stories that display creator/updater information:

```typescript
import {
  mockUserProfileServices,
  MOCK_USER_PROFILES,
  MOCK_USER_PROFILES_MAP,
} from '@kbn/content-list-mock-data';

// Use the mock services in your story context
const { getUserProfile, bulkGetUserProfiles } = mockUserProfileServices;

// Fetch a single profile
const profile = await getUserProfile('u_jane_doe');

// Bulk fetch profiles
const profiles = await bulkGetUserProfiles(['u_jane_doe', 'u_john_smith']);
```

## API

### Mock Data Collections

| Export | Type | Description |
|--------|------|-------------|
| `MOCK_DASHBOARDS` | `DashboardMockItem[]` | 8 dashboard items with titles, descriptions, tags, and metadata. |
| `MOCK_VISUALIZATIONS` | `VisualizationMockItem[]` | 8 visualization items spanning multiple viz types (Lens, Pie, Table, etc.). |
| `MOCK_MAPS` | `MapMockItem[]` | 5 map items representing geographic visualizations. |
| `MOCK_FILES` | `FileMockItem[]` | 6 file items demonstrating custom content type attributes. |
| `MOCK_TAGS` | `MockTag[]` | 8 tags including both user-created and managed (Fleet) tags. |
| `MOCK_USERS` | `readonly string[]` | Array of mock user IDs used across content items. |
| `MOCK_USER_PROFILES` | `UserProfile[]` | User profile objects corresponding to `MOCK_USERS`. |
| `MOCK_USER_PROFILES_MAP` | `Record<string, UserProfile>` | Map for quick user profile lookup by uid. |

### Mock Functions

| Export | Description |
|--------|-------------|
| `mockFindDashboards` | Pre-configured `findItems` for dashboards with status support. |
| `mockFindMaps` | Pre-configured `findItems` for maps with status support. |
| `mockFindFiles` | Pre-configured `findItems` for files with status support. |
| `mockFindVisualizations` | Pre-configured `findItems` for visualizations with status support. |
| `createMockFindItems<T>(config)` | Factory to create custom `findItems` from any item array. |
| `createSimpleMockFindItems(delay?)` | Simplified factory using built-in dashboard data. |

### User Profile Utilities

| Export | Description |
|--------|-------------|
| `mockUserProfileServices` | Object containing `getUserProfile` and `bulkGetUserProfiles` mock implementations. |

### Types

| Export | Description |
|--------|-------------|
| `DashboardMockItem` | Dashboard item type extending `UserContentCommonSchema`. |
| `VisualizationMockItem` | Visualization item type with `visType` attribute. |
| `MapMockItem` | Map item type extending `UserContentCommonSchema`. |
| `FileMockItem` | File item type with size, extension, and mimeType attributes. |
| `MockTag` | Tag type with id, name, description, color, and managed flag. |
| `MockContentItem` | Union type of all mock item types. |
| `MockFindItemsConfig<T>` | Configuration interface for `createMockFindItems`. |
| `ItemWithStatus` | Item type with required `status` field for customization stories. |
| `ContentStatus` | Status union type: `'active' \| 'draft' \| 'archived' \| 'review'`. |
| `VisualizationType` | Visualization type union (lens, area, line, bar, pie, etc.). |
| `MockUser` | Mock user ID type. |

