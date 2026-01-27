# @kbn/content-management-tags

A standalone package for adding tagging functionality to content management features with full Saved Objects Tagging integration.

## Overview

This package provides a layered architecture for tag support:
- **Core Layer**: Generic, decoupled tag functionality that works with any tag source.
- **Kibana Layer**: Adapter for Kibana's `SavedObjectsTaggingApi`.

## Features

- Tag display with colors and descriptions.
- EUI Query syntax support for tag filtering.
- Click and Ctrl/Cmd+click support for include/exclude filtering.
- Synchronous API (no unnecessary async complexity).
- Two-layer architecture (core + Kibana adapter).
- Type-safe with full TypeScript support.
- Testable with mock implementations.

## Installation

This package is part of the Kibana monorepo. To use it, import from `@kbn/content-management-tags`.

## Usage

### For Kibana Apps (Recommended)

Most Kibana apps should use the `ContentManagementTagsKibanaProvider` which automatically adapts the `SavedObjectsTaggingApi`:

```tsx
import { ContentManagementTagsKibanaProvider } from '@kbn/content-management-tags';

const MyApp = ({ savedObjectsTaggingService }) => {
  return (
    <ContentManagementTagsKibanaProvider
      savedObjectsTagging={savedObjectsTaggingService?.getTaggingApi()}
    >
      <MyContent />
    </ContentManagementTagsKibanaProvider>
  );
};
```

### For Custom Tag Implementations

For non-Kibana apps or custom tag sources, use the core `ContentManagementTagsProvider` directly:

```tsx
import { ContentManagementTagsProvider } from '@kbn/content-management-tags';

const MyCustomApp = () => {
  const getTagList = () => myCustomTags;
  const parseSearchQuery = (query) => myCustomParser(query);

  return (
    <ContentManagementTagsProvider
      getTagList={getTagList}
      parseSearchQuery={parseSearchQuery}
    >
      <MyContent />
    </ContentManagementTagsProvider>
  );
};
```

### Using Tag Components

Once a provider is set up, you can use tag components:

```tsx
import { TagList, TagBadge } from '@kbn/content-management-tags';

// TagList resolves tag IDs to full tag objects via context
const MyComponent = ({ item }) => {
  const handleClick = (tag, withModifierKey) => {
    if (withModifierKey) {
      // Ctrl/Cmd+click: exclude tag from filter
      console.log('Exclude tag:', tag.name);
    } else {
      // Click: include tag in filter
      console.log('Include tag:', tag.name);
    }
  };

  return <TagList tagIds={item.tags} onClick={handleClick} />;
};

// TagBadge displays a single tag (no context required if you have the full Tag object)
const SingleTagDisplay = ({ tag }) => <TagBadge tag={tag} />;
```

### Tag Filtering with `useTags`

The `useTags` hook helps manage tag filtering in EUI search queries:

```tsx
import { useTags } from '@kbn/content-management-tags';
import { Query } from '@elastic/eui';

const MySearchableList = ({ items }) => {
  const [query, setQuery] = useState(Query.parse(''));

  const {
    toggleIncludeTagFilter,
    toggleExcludeTagFilter,
    clearTagSelection,
    tagsToTableItemMap,
  } = useTags({
    query,
    updateQuery: setQuery,
    items,
  });

  const handleTagClick = (tag, withModifierKey) => {
    if (withModifierKey) {
      toggleExcludeTagFilter(tag);
    } else {
      toggleIncludeTagFilter(tag);
    }
  };

  return (
    <>
      <button onClick={clearTagSelection}>Clear tag filters</button>
      {items.map((item) => (
        <div key={item.id}>
          <TagList tagIds={item.tags} onClick={handleTagClick} />
        </div>
      ))}
    </>
  );
};
```

## API Reference

### Providers

#### `ContentManagementTagsProvider`

Generic context provider that accepts any tag implementation.

**Props:**
- `getTagList: () => Tag[]` - Function to get all available tags.
- `parseSearchQuery?: (query: string) => ParsedQuery` - Optional query parser.
- `children: ReactNode`

#### `ContentManagementTagsKibanaProvider`

Kibana-specific adapter that converts `SavedObjectsTaggingApi` to core signatures.

**Props:**
- `savedObjectsTagging?: { ui: Pick<SavedObjectsTaggingApiUi, 'getTagList' | 'parseSearchQuery' | 'getSearchBarFilter' | 'getTagIdFromName'> }`
- `children: ReactNode`

### Hooks

#### `useTagServices()`

Hook to access tag services from the context. Returns `undefined` if no provider is present, allowing components to gracefully handle scenarios where tag support may not be configured.

**Returns:** `Services | undefined`
- `getTagList: () => Tag[]` - Get all tags.
- `parseSearchQuery?: (query: string) => ParsedQuery` - Parse search query for tag filters.

#### `useTags(params)`

Hook for managing tag filtering in EUI search queries.

**Params:**
- `query: Query` - Current EUI search query.
- `updateQuery: (query: Query) => void` - Callback to update the query.
- `items: Array<{ id: string; tags?: string[] }>` - Items with tag IDs.

**Returns:**
- `toggleIncludeTagFilter: (tag: Tag) => void` - Toggle tag in include filter.
- `toggleExcludeTagFilter: (tag: Tag) => void` - Toggle tag in exclude filter.
- `clearTagSelection: () => void` - Clear all tag filters.
- `tagsToTableItemMap: { [tagId: string]: string[] }` - Map of tag IDs to item IDs.

### Components

#### `<TagBadge>`

Displays a single tag as a colored badge.

**Props:**
- `tag: Tag` - The tag to display.
- `onClick?: (tag: Tag, withModifierKey: boolean) => void` - Click handler. `withModifierKey` is `true` when Ctrl (Windows/Linux) or Cmd (Mac) is held.

#### `<TagList>`

Displays a list of tags for an item. Resolves tag IDs to full tag objects via context.

**Props:**
- `tagIds: string[]` - Array of tag IDs.
- `onClick?: (tag: Tag, withModifierKey: boolean) => void` - Click handler for tag badges.

#### `<TagListComponent>`

Pure component that renders a list of tags. Does not require context (useful for testing or when you already have full `Tag` objects).

**Props:**
- `tags: Tag[]` - Array of tag objects.
- `onClick?: (tag: Tag, withModifierKey: boolean) => void` - Click handler for tag badges.

## Types

```typescript
interface Tag {
  id?: string;
  name: string;
  description: string;
  color: string;
  managed: boolean;
}

interface ParsedQuery {
  searchQuery: string;
  tagIds?: string[];
  tagIdsToExclude?: string[];
}
```

## Architecture

### Layered Design

The package uses a two-layer architecture:

**Layer 1: Core/Generic** (`services.tsx`)
- Defines simple, generic function signatures.
- No dependencies on `SavedObjectsTaggingApi`.
- Fully testable with mocks.

**Layer 2: Kibana Adapter** (`services.tsx`)
- Adapts `SavedObjectsTaggingApi` to core signatures.
- Implements `parseSearchQuery` synchronously using tag cache.
- Wraps core provider internally.

### Synchronous `parseSearchQuery`

The Kibana adapter implements `parseSearchQuery` synchronously (even though Kibana's API is async) by:
1. Getting tags from cache synchronously via `ui.getTagList()`.
2. Parsing EUI Query syntax with `Query.parse()`.
3. Extracting tag clauses with `query.ast.getFieldClauses('tag')`.
4. Resolving tag names to IDs using cached tags.
5. Returning the parsed result synchronously.

This avoids unnecessary Promise wrapping while still leveraging Kibana's tag cache.

## Testing

```tsx
import { ContentManagementTagsProvider } from '@kbn/content-management-tags';

const mockTags = [
  { id: '1', name: 'urgent', description: 'Urgent items', color: '#FF0000', managed: false },
  { id: '2', name: 'review', description: 'Needs review', color: '#0000FF', managed: false },
];

const mockGetTagList = () => mockTags;

const wrapper = ({ children }) => (
  <ContentManagementTagsProvider getTagList={mockGetTagList}>
    {children}
  </ContentManagementTagsProvider>
);
```

## See Also

- [Saved Objects Tagging Plugin](https://github.com/elastic/kibana/tree/main/x-pack/plugins/saved_objects_tagging)
