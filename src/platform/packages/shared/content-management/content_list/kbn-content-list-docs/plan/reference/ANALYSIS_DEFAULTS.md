# Feature Defaults Analysis

## Document Purpose

This document analyzes which `ContentListProvider` features can use `true` for sensible defaults versus which require explicit configuration. It informs the API design decisions.

**Related Documents:**
- **[LISTING_COMPONENT.md](../LISTING_COMPONENT.md)** - Component API specifications
- **[LISTING_PROVIDER.md](../LISTING_PROVIDER.md)** - Provider implementation details

---

## Question
Which `ContentListProviderProps` features can use `true` for sensible defaults vs. which require configuration?

---

## Key Settings from Kibana Advanced Settings

The new architecture needs to respect these user preferences:

| Setting | Key | Default | Purpose | Where Used |
|---------|-----|---------|---------|------------|
| **Items per page** | `savedObjects:perPage` | 5 (but often 20 in practice) | Number of items to show per page | `pagination={true}` |
| **Listing limit** | `savedObjects:listingLimit` | 1000 | Max number of items to fetch from server | `dataSource.findItems()` |

**Access via:** `coreServices.uiSettings.get(key)`

**Implementation approach:**

Consumers should read these settings and pass them as configuration when needed:

```tsx
// In your listing component
function DashboardListing({ uiSettings }: Props) {
  const initialPageSize = uiSettings.get('savedObjects:perPage');
  const listingLimit = uiSettings.get('savedObjects:listingLimit');
  
  const findItems = useCallback(async (searchQuery: string) => {
    return await fetchDashboards(searchQuery, listingLimit);
  }, [listingLimit]);

  return (
    <ContentListProvider
      entityName="dashboard"
      dataSource={{ findItems }}
      pagination={{ initialPageSize }}
    >
      {/* ... */}
    </ContentListProvider>
  );
}
```

**Benefits of this approach:**
- **Explicit configuration** - Clear where values come from
- **No hidden dependencies** - Settings usage is visible
- **Easy to test** - Mock settings, pass values directly
- **Flexible** - Each consumer controls their own defaults
- **No additional abstractions** - Uses existing Kibana patterns

---

## Summary Table

> For detailed interface definitions and all available configuration options, see [LISTING_COMPONENT.md](../LISTING_COMPONENT.md#contentlistprovider).

| Feature | Can Use `true`? | Default Behavior | Notes |
|---------|----------------|------------------|-------|
| **search** | Yes | Full search with built-in parser | All sub-options have defaults |
| **sorting** | Yes | Title (A-Z), Last Updated | Auto-detects available fields |
| **pagination** | Yes | 20 items per page, [10,20,50] options | Standard pagination |
| **urlState** | Yes | Syncs search, sort, filters to URL | Uses built-in serializers |
| **filtering** | Maybe | Depends on sub-features | `tags`/`users`/`favorites` can use true |
| **actions** | Maybe | Empty actions object | Useful for read-only lists |
| **dataSource** | Never | N/A - Required | Must provide `findItems` callback |
| **recentlyAccessed** | Never | N/A | Requires external service |

---

## Detailed Analysis

### Features with Full Defaults

#### 1. **search={true}**

**All config has sensible defaults:**

```tsx
// Explicitly configured
search={{
  initialQuery: '',              // ✓ Default: empty string
  queryParser: builtInKQLParser, // ✓ Default: KQL-like parser
  debounceMs: 300,               // ✓ Default: 300ms
  forbiddenChars: '()[]{}<>...',  // ✓ Default: standard forbidden chars
  onQueryChange: undefined,       // ✓ Default: no callback
}}

// Can just use
search={true}
```

**Why it works:**
- Built-in query parser handles common syntax
- Debounce timing is well-established (300ms)
- Forbidden characters are consistent across Kibana
- No external dependencies needed

**Default behavior:**
- Search box appears in toolbar
- Searches across item title by default
- Validates query syntax
- Updates URL with search term
- Debounces input automatically

---

#### 2. **sorting={true}**

**All config has sensible defaults:**

```tsx
// Explicitly configured
sorting={{
  defaultSort: { field: 'attributes.title', direction: 'asc' },  // ✓ Default: Title A-Z
  options: [                                                      // ✓ Default: Title + Last Updated
    { field: 'attributes.title', label: 'Title' },
    { field: 'updatedAt', label: 'Last updated' },
  ],
  persist: true,              // ✓ Default: save to localStorage
  onChange: undefined,        // ✓ Default: no callback
}}

// Can just use
sorting={true}
```

**Why it works:**
- Title sorting is universally applicable
- Last updated is available on `UserContentCommonSchema`
- localStorage persistence is desirable by default
- Sort options can be auto-detected from item schema

**Default behavior:**
- Sort dropdown appears in filters area
- Initially sorted by title (A-Z)
- Shows "Title" and "Last updated" options
- Persists choice to localStorage (per entity type)
- Updates URL with sort state

**Auto-detection:**
Provider can introspect the first item to add more options:
- If `accessedAt` exists → add "Recently accessed"
- If `createdBy` exists → add "Creator"
- If `favoriteCount` exists → add "Most favorited"

---

#### 3. **pagination={true}**

**All config has sensible defaults:**

```tsx
// Explicitly configured
pagination={{
  initialPageSize: 20,                  // ✓ Default: 20 items (or from uiSettings)
  pageSizeOptions: [10, 20, 50],       // ✓ Default: standard options
  persist: true,                        // ✓ Default: save to localStorage
  onChange: undefined,                  // ✓ Default: no callback
}}

// Can just use
pagination={true}
```

**Why it works:**
- Uses Kibana's `savedObjects:perPage` advanced setting as default
- Standard page size options are well-established
- localStorage persistence improves UX
- Automatically reads from uiSettings if available

**How it gets the default page size:**

```tsx
// Current implementation (consumers do it):
const initialPageSize = coreServices.uiSettings.get('savedObjects:perPage');

<TableListView
  initialPageSize={initialPageSize}
  // ... other props
/>
```

**For the new architecture, pass settings explicitly:**

```tsx
// In your listing component
function DashboardListing({ uiSettings }: Props) {
  const initialPageSize = uiSettings.get('savedObjects:perPage');
  
  return (
    <ContentListProvider
      entityName="dashboard"
      dataSource={{ findItems }}
      pagination={{ initialPageSize }}
    >
      {/* ... */}
    </ContentListProvider>
  );
}

// Can use different values when needed
<ContentListProvider
  pagination={{
    initialPageSize: 50  // Explicit override
  }}
>
```

**Usage in real Kibana plugins:**

```tsx
//In listing components, pass uiSettings and use them
function DashboardListing({ uiSettings }: Props) {
  const initialPageSize = uiSettings.get('savedObjects:perPage');
  const listingLimit = uiSettings.get('savedObjects:listingLimit');
  
  const findItems = useCallback(async (searchQuery: string) => {
    return await fetchDashboards(searchQuery, listingLimit);
  }, [listingLimit]);
  
  return (
    <ContentListProvider
      entityName="dashboard"
      entityNamePlural="dashboards"
      dataSource={{ findItems }}
      pagination={{ initialPageSize }}
    >
      <ContentList.Table />
    </ContentListProvider>
  );
}
```

**Usage in Jest tests:**

```tsx
describe('DashboardListing', () => {
  it('respects pagination settings', () => {
    const mockUiSettings = {
      get: jest.fn().mockReturnValue(25),
    };
    
    render(<DashboardListing uiSettings={mockUiSettings} />);
    
    // Assert pagination uses 25 items per page
    expect(screen.getByText(/25 items per page/)).toBeInTheDocument();
  });
});
```

**Usage in Storybook:**

```tsx
export default {
  component: DashboardListing,
  args: {
    uiSettings: {
      get: (key: string) => key === 'savedObjects:perPage' ? 20 : 100,
    },
  },
};

export const Default: Story = {
  render: () => (
    <ContentListProvider
      entityName="dashboard"
      entityNamePlural="dashboards"
      dataSource={{
        findItems: async (query, refs, { limit }) => ({
          total: mockDashboards.length,
          hits: mockDashboards.slice(0, limit)
        })
      }}
      search={true}
      sorting={true}
      pagination={true}
    >
      <ContentList.Table />
    </ContentListProvider>
  )
};
```

**Default behavior:**
- Footer shows pagination controls
- Initially shows user's preferred page size (from advanced settings)
- Fallback to 20 items if setting not available
- User can choose 10, 20, or 50
- Persists page size to localStorage
- Resets to page 1 on filter changes

---

#### 4. **urlState={true}**

**All config has sensible defaults:**

```tsx
// Explicitly configured
urlState={{
  deserializer: defaultDeserializer,  // ✓ Default: built-in deserializer
  serializer: defaultSerializer,      // ✓ Default: built-in serializer
}}

// Can just use
urlState={true}
```

**Why it works:**
- Built-in serializers handle standard state:
  - `s` or `title` → search query
  - `sort`, `sortdir` → sort field and direction
  - `created_by[]` → user filter
  - `favorites` → favorites filter
- Backward compatible (supports both `s` and `title`)
- Sanitizes duplicate query params
- No external dependencies

**Default behavior:**
- Syncs search, sort, filters to URL automatically
- Enables shareable links
- Enables bookmarkable searches
- Restores state on page load
- Updates URL without page reload

---

### Features with Partial Defaults

#### 5. **filtering** (Complex)

**Sub-features have different requirements:**

```tsx
// tags={true} works
filtering={{
  tags: true,  // Auto-detects tags from item references
}}

// users={true} works
filtering={{
  users: true,  // Auto-detects creators from createdBy field
}}

// favorites={true} works
filtering={{
  favorites: true,  // Uses Kibana favorites service
}}

// custom requires config
filtering={{
  custom: [  // No sensible default - must provide components
    { id: 'myFilter', component: MyFilterComponent }
  ]
}}

// So you can use:
filtering={true}  // Enables tags + users + favorites with defaults

// Or selectively:
filtering={{ tags: true, users: true }}  // Just tags and users
```

**Why tags={true} works:**
- Tags are extracted from item `references` array
- Uses `getTagIdsFromReferences()` service (injected globally)
- `getTagList()` service provides tag metadata
- Default mode is `'both'` (include and exclude)

**Why users={true} works:**
- Users are extracted from item `createdBy` field
- User profiles fetched from user profile service (injected globally)
- `showNoUserOption` defaults to `true` (show legacy items)

**Why favorites={true} works:**
- Checks `isFavoritesEnabled()` service to see if available
- Uses favorites service (injected globally)
- Default variant is `'button'`
- Automatically hides if service not available

**Default behavior:**
- `filtering={true}` enables all three with defaults
- Filter buttons appear in toolbar
- Each filter panel has search and selection UI
- Active filters show count badges
- "Clear all filters" button appears when active

---

#### 6. **actions.selection** (Questionable Default)

**No actions by default:**

```tsx
// Current proposal allows this:
actions={{ selection: {} }}  // Enables selection state with no bulk actions

// But is this useful? What can you do with selected items?
// Maybe for external integration:
function MyComponent() {
  const { selectedItems } = useContentListSelection();
  return <MyExternalTool items={selectedItems} />;
}
```

**Recommendation: Require at least one action**

```tsx
// Don't allow an empty object
actions={{ selection: {} }}  // What's the point of selection with no actions?

// Require at least one action
actions={{ selection: { onDelete } }}  // Enable selection + bulk delete
actions={{ selection: { onExport } }}  // Custom actions
actions={{ selection: {   // Multiple actions
  onDelete,
  onExport
}}}
```

**Default behavior (if provided):**
- Checkboxes appear on each row
- "Select all" in table header
- Selected count displayed
- Bulk action toolbar appears when items selected
- "Delete selected" button (if onDelete provided)
- Custom action buttons (if additional handlers provided)

---

### Features That Never Have Defaults

#### 7. **dataSource** (Always Required)

**Why no default:**
- Can't guess how to fetch data
- Every app has different APIs
- Different authentication requirements
- Different error handling needs

```tsx
// Can't default
dataSource={true}

// Must provide (at minimum, findItems)
dataSource={{
  findItems: async (query, refs, { limit }) => {
    // limit is auto-injected from services.getListingLimit()
    const response = await myAPI.search({ query, size: limit });
    return { total: response.total, hits: response.items };
  },
  onFetchSuccess: () => trackMetric('list_loaded'),
  onFetchError: (error) => showErrorToast(error),
}}
```

**Important: The `findItems` callback must handle the listing limit**

The callback should use `savedObjects:listingLimit` setting to control how many results to fetch:

```tsx
// Current implementation (consumers handle it):
const listingLimit = coreServices.uiSettings.get('savedObjects:listingLimit');

const findItems = useCallback(async (searchTerm, refs) => {
  return findService.search({
    search: searchTerm,
    size: listingLimit,  // ← Max results to fetch (default: 1000)
    hasReference: refs?.references,
    hasNoReference: refs?.referencesToExclude,
  });
}, [listingLimit]);

<TableListView
  findItems={findItems}
  // ...
/>
```

**For the new architecture, we need to inject the listing limit:**

Since `findItems` is a required callback that consumers provide, they need access to the listing limit. We have two options:

**Option 1: Provide as parameter (breaking change for consumers)**
```tsx
dataSource={{
  findItems: async (query, refs, options) => {
    // options.limit provided by ContentListProvider
    const response = await myAPI.search({
      query,
      size: options.limit,  // From uiSettings.get('savedObjects:listingLimit')
    });
    return { total: response.total, hits: response.items };
  }
}}
```

**Option 2: Provide via configuration (recommended)**
```tsx
dataSource={{
  // Provider reads 'savedObjects:listingLimit' automatically and passes it
  findItems: async (query, refs) => {
    const response = await myAPI.search({ query });
    return { total: response.total, hits: response.items };
  },
  // Optional: Override the listing limit
  limit?: number | 'from-settings',  // Default: reads from uiSettings
}}
```

**Option 3: Expose via hook (most flexible)**
```tsx
function MyComponent() {
  const { listingLimit } = useContentListSettings();
  
  const findItems = useCallback(async (query, refs) => {
    const response = await myAPI.search({
      query,
      size: listingLimit,  // From uiSettings.get('savedObjects:listingLimit')
    });
    return { total: response.total, hits: response.items };
  }, [listingLimit]);
  
  return (
    <ContentListProvider
      dataSource={{ findItems }}
      // ...
    />
  );
}
```

## Recommended Approach: Explicit Consumer Responsibility

Consumers should read `savedObjects:listingLimit` from uiSettings and use it in their `findItems` callback. This approach provides explicit configuration with no hidden dependencies.

**Why this approach:**
- No hidden dependencies - Clear where values come from
- Explicit and testable - Easy to mock in tests
- Flexible per consumer - Each consumer controls their own limits
- Matches Kibana patterns - Consistent with existing codebase

**Implementation:**

```tsx
// Pass limit explicitly in findItems
function DashboardListing({ uiSettings }: Props) {
  const listingLimit = uiSettings.get('savedObjects:listingLimit');
  
  const findItems = useCallback(async (query: string) => {
    return await dashboardAPI.search({ query, size: listingLimit });
  }, [listingLimit]);
  
  return (
    <ContentListProvider
      dataSource={{ findItems }}
    />
  );
}

// Testing case: pass mock value
it('respects listing limit', () => {
  const mockUiSettings = {
    get: jest.fn().mockReturnValue(100),
  };
  
  render(<DashboardListing uiSettings={mockUiSettings} />);
});
```

---

#### 8. **actions** (Optional - Enables User Actions)

**Why no default needed:**
- All actions are optional - omit for read-only lists
- Action behavior varies by app (navigation, modal, inline, etc.)
- Each action type has clear semantics based on execution context

```tsx
// Optional - omit for read-only lists
// (no actions prop, no item prop)

// Provide only what you need
// Note: 'item' is a separate prop from 'actions'
<ContentListProvider
  item={{
    actions: {
      onEdit: (item) => openEditor(item.id),  // Per-item action
      onDuplicate: (item) => cloneDashboard(item),
    },
  }}
  actions={{
    onCreate: () => navigateTo('/create'),  // Global action, no item context
    selection: {  // Bulk actions
      onDelete: (items) => deleteItems(items.map(i => i.id)),
      onExport: (items) => exportToFile(items),
    },
  }}
/>

// Additional custom per-item actions
<ContentListProvider
  item={{
    actions: {
      onEdit: editItem,
      onDuplicate: duplicateItem,
      share: shareItem,  // Custom action - extensible
    }
  }}
/>
```

**Rendering behavior:**
- `actions.onCreate` → "Create" button in empty state and page header
- `item.actions.onClick` → Primary click/tap behavior (row click)
- `item.actions.onEdit` → "Edit" button in row actions menu
- `item.actions.onDuplicate` → "Duplicate" button in row actions menu
- `item.actions.onExport` → "Export" button in row actions menu
- `item.actions.onDelete` → "Delete" button in row actions menu (danger color)
- `item.actions[custom]` → Additional custom actions in row actions menu (extensible)
- `actions.selection.*` → Buttons in bulk actions toolbar (shown when items selected)
- If no actions provided → Read-only list (no action buttons rendered)

---

#### 9. **recentlyAccessed** (Always Requires Service)

**Why no default:**
- Requires external service integration
- Service may not be available in all contexts
- `get()` method must return specific format
- Can't auto-detect or default

```tsx
// Can't default
recentlyAccessed={true}

// Must provide service
recentlyAccessed={{
  get: () => recentlyAccessedService.get('dashboard'),
  add: (id) => recentlyAccessedService.add('dashboard', id),
}}
```

**Behavior:**
- Adds "Recently accessed" sort option
- Sorts items by most recent access first
- Optionally tracks new accesses (if `add` provided)

---

## Recommended API Changes

Based on this analysis, I recommend these adjustments:

### 1. Make `filtering={true}` Enable All Sub-Features

```tsx
// Shorthand: enable all filters with defaults
filtering={true}

// Equivalent to:
filtering={{
  tags: true,
  users: true,
  favorites: true,
}}

// Still allow selective:
filtering={{ tags: true, users: true }}  // Just tags and users
```

### 2. Require Configuration for `actions.selection`

To enable selection UI, at least one selection action handler must be provided. This is enforced at both the TypeScript type level and documented in the API.

**TypeScript Enforcement:**

The `SelectionActions<T>` type uses an intersection type to require at least one handler:

```typescript
type SelectionActions<T> = {
  onDelete?: (items: T[]) => void;
  onExport?: (items: T[]) => void;
  [key: string]: ((items: T[]) => void) | undefined;
} & (
  | { onDelete: (items: T[]) => void }      // Must have onDelete, OR
  | { onExport: (items: T[]) => void }      // Must have onExport, OR
  | { [key: string]: (items: T[]) => void } // Must have custom action
);
```

**Usage Examples:**

```tsx
// TypeScript error - empty selection not allowed.
actions={{ selection: {} }}

// Required - at least one selection action.
actions={{
  selection: {
    onDelete: async (items) => { /* delete logic */ },
  },
}}

// Multiple selection actions.
actions={{
  selection: {
    onDelete: async (items) => { /* delete */ },
    onExport: async (items) => { /* export */ },
  },
}}

// Custom action.
actions={{
  selection: {
    onArchive: async (items) => { /* archive logic */ },
  },
}}
```

**Rationale:** 
- Prevents useless API usage at compile-time
- If no selection actions are provided, there's no reason to enable selection UI
- Type safety guides consumers toward correct usage
- Advanced users can still access selection state via `useContentListSelection()` hook if needed

See [LISTING_PROVIDER.md](../LISTING_PROVIDER.md) and [LISTING_COMPONENT.md](../LISTING_COMPONENT.md) for full type definitions.

---

## Complete "Minimal Config" Example

```tsx
// Absolutely minimal - only required fields
function DashboardListing({ uiSettings }: Props) {
  const listingLimit = uiSettings.get('savedObjects:listingLimit');
  
  const findItems = useCallback(async (query: string) => {
    const response = await api.search({ query, size: listingLimit });
    return { total: response.total, hits: response.items };
  }, [listingLimit]);
  
  return (
    <ContentListProvider
      entityName="dashboard"
      entityNamePlural="dashboards"
      dataSource={{ findItems }}
    >
      <ContentList.Table />
    </ContentListProvider>
  );
}

// Realistic minimal - common features with defaults
<ContentListProvider
  entityName="dashboard"
  entityNamePlural="dashboards"
  dataSource={{
    findItems: async (query, refs, { limit }) => {
      // limit from context [default: 1000]
      return await api.search({ query, size: limit });
    }
  }}
  search={true}          // Full search with built-in parser
  sorting={true}         // Title + Last Updated options
  filtering={true}       // Tags + Users + Favorites (if available)
  pagination={true}      // Reads from context [typically 5-20]
  urlState={true}        // Syncs to URL automatically
  actions={{             // Optional - provide what you need
    selection: { onDelete }
  }}
>
  <ContentList.Toolbar />
  <ContentList.Table />
  <ContentList.Footer />
</ContentListProvider>

// Advanced: Override context defaults
<ContentListProvider
  dataSource={{
    findItems: async (query, refs, { limit }) => {
      return await api.search({ query, size: limit });
    },
    limit: 500,  // Override context default
  }}
  pagination={{
    initialPageSize: 50  // Override context default
  }}
>

// Testing/Storybook: Easy mocking via props
function DashboardListingTest() {
  const mockUiSettings = {
    get: (key: string) => key === 'savedObjects:perPage' ? 20 : 100,
  };
  
  const listingLimit = mockUiSettings.get('savedObjects:listingLimit');
  const initialPageSize = mockUiSettings.get('savedObjects:perPage');
  
  return (
    <ContentListProvider
      entityName="dashboard"
      entityNamePlural="dashboards"
      dataSource={{
        findItems: async (query: string) => {
          return {
            total: mockDashboards.length,
            hits: mockDashboards.slice(0, listingLimit)
          };
        }
      }}
      search={true}
      sorting={true}
      pagination={{ initialPageSize }}
    >
      <ContentList.Table />
    </ContentListProvider>
  );
}
```

---

## Benefits of These Defaults

1. **Low barrier to entry** - Most features work with `true`
2. **Progressive disclosure** - Start simple, add config as needed
3. **Consistent behavior** - Defaults match Kibana patterns
4. **Zero-config common features** - Search, sort, pagination "just work"
5. **Clear API contract** - When config is required, it's obvious

## Trade-offs

1. **"Magic" behavior** - Some defaults use global services (tags, users, favorites)
2. **Less explicit** - `filtering={true}` enables multiple sub-features at once
3. **Debugging complexity** - Default behavior may be harder to understand vs explicit config

## Conclusion

**Features that work with `true` (complete defaults):**
- `search={true}` - full search with built-in parser
- `sorting={true}` - title + last updated options
- `pagination={true}` - 20 items per page
- `urlState={true}` - syncs state to URL

**Features with partial defaults (may work with `true`):**
- `filtering={true}` - enables tags + users + favorites (all have defaults)

**Features that always need configuration:**
- `dataSource` - must provide `findItems` callback (required)
- `actions` - optional, but each action needs its callback when provided
- `recentlyAccessed` - must provide service integration

This creates a **low-friction, high-ceiling API** where simple cases are truly simple, but complex cases are fully supported.

