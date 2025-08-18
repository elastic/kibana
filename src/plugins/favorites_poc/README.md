# Favorites POC Plugin

A proof-of-concept plugin that provides a reusable favorites service and UI components for Kibana applications. This plugin demonstrates how to create a cross-app favorites system that can be used consistently across different Kibana plugins.

## Overview

The Favorites POC plugin provides:

1. **FavoritesService** - A service for managing favorites across different object types
2. **FavoriteStarButton** - A reusable UI component for favoriting/unfavoriting items
3. **Integration with SavedObjectFinder** - Star buttons in saved object lists across Kibana

## Architecture

### FavoritesService

The `FavoritesService` is a drop-in replacement for the existing `FavoritesClient` that provides:

- **Backward compatibility** - Implements the same interface as `FavoritesClient`
- **Enhanced functionality** - Cross-app favorites queries
- **Error handling** - Graceful fallback when API calls fail
- **Local caching** - Session persistence during development

### FavoriteStarButton

A reusable React component that provides:

- **Consistent UI** - Matches Kibana's existing star button design
- **Hover behavior** - Shows/hides based on favorite status
- **Starburst animation** - Visual feedback when toggling favorites
- **Error handling** - Graceful degradation when services are unavailable

## Usage

### 1. Plugin Setup

Add the plugin to your `kibana.jsonc`:

```jsonc
{
  "type": "plugin",
  "id": "@kbn/favorites-poc-plugin",
  "plugin": {
    "id": "favoritesPoc",
    "requiredPlugins": ["contentManagement"],
    "optionalPlugins": []
  }
}
```

### 2. Server-Side Registration

Register favorite types in your server plugin:

```typescript
// In your server plugin setup
public setup(core: CoreSetup, { contentManagement }: Dependencies) {
  // Register your content type as a favorite type
  contentManagement.favorites.registerFavoriteType('your_content_type');
}
```

### 3. Client-Side Integration

#### Basic Usage

```typescript
import { FavoriteStarButton } from '@kbn/favorites-poc-plugin/public';

// In your component
<FavoriteStarButton
  type="dashboard"
  id="dashboard-123"
  favoritesService={favoritesService}
  onFavoriteChange={(isFavorite) => {
    console.log(`Dashboard is now ${isFavorite ? 'favorited' : 'unfavorited'}`);
  }}
/>
```

#### With FavoritesService

```typescript
import { FavoritesService } from '@kbn/favorites-poc-plugin/public';

// Configure the service for your app
const favoritesService = new FavoritesService({
  http: coreServices.http,
  userProfile: coreServices.userProfile,
  usageCollection: coreServices.usageCollection,
}).configureForApp('your-app-id', 'your-content-type');

// Use in components
<FavoriteStarButton
  type="your-content-type"
  id="item-id"
  favoritesService={favoritesService}
/>
```

#### Integration with SavedObjectFinder

The plugin automatically adds star buttons to `SavedObjectFinder` components when a `favoritesService` is provided:

```typescript
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';

<SavedObjectFinder
  // ... other props
  favoritesService={configuredFavoritesService}
  savedObjectMetaData={[
    {
      type: 'your-content-type',
      getIconForSavedObject: () => 'yourIcon',
      name: 'Your Content Type',
    },
  ]}
/>
```

## API Reference

### FavoritesService

#### Methods

- `configureForApp(appName: string, contentType: string)` - Configure for specific app context
- `addFavorite(params: { id: string; metadata?: object })` - Add item to favorites
- `removeFavorite(params: { id: string })` - Remove item from favorites
- `getFavorites()` - Get all favorites for current content type
- `isFavorite(type: string, id: string)` - Check if item is favorited
- `toggleFavorite(type: string, id: string)` - Toggle favorite status
- `getAllFavorites()` - Get favorites across all types
- `getFavoritesForTypes(types: string[])` - Get favorites for specific types

### FavoriteStarButton

#### Props

- `type: string` - The type of object being favorited
- `id: string` - The ID of the object being favorited
- `favoritesService: FavoritesService` - The favorites service to use
- `onFavoriteChange?: (isFavorite: boolean) => void` - Callback when status changes
- `alwaysShow?: boolean` - Whether to show button always (default: false)
- `className?: string` - Optional CSS class name

## Examples

### Dashboard Integration

```typescript
// In dashboard listing component
const dashboardFavoritesService = favoritesService.configureForApp('dashboards', 'dashboard');

<FavoriteStarButton
  type="dashboard"
  id={dashboard.id}
  favoritesService={dashboardFavoritesService}
  onFavoriteChange={(isFavorite) => {
    // Handle favorite change
  }}
/>
```

### Discover Integration

```typescript
// In Discover saved search flyout
const discoverFavoritesService = favoritesService.configureForApp('discover', 'search');

<SavedObjectFinder
  favoritesService={discoverFavoritesService}
  savedObjectMetaData={[
    {
      type: 'search',
      getIconForSavedObject: () => 'discoverApp',
      name: 'Discover session',
    },
  ]}
/>
```

### Custom Table Integration

```typescript
// In a custom table component
<EuiTable css={cssFavoriteHoverWithinTable(euiTheme)}>
  <EuiTableBody>
    {items.map((item) => (
      <EuiTableRow key={item.id}>
        <EuiTableRowCell>
          {item.title}
        </EuiTableRowCell>
        <EuiTableRowCell>
          <FavoriteStarButton
            type={item.type}
            id={item.id}
            favoritesService={favoritesService}
            className="favorite-star-button--empty"
          />
        </EuiTableRowCell>
      </EuiTableRow>
    ))}
  </EuiTableBody>
</EuiTable>
```

## CSS Utilities

The plugin provides CSS utilities for hover behavior:

```typescript
import { cssFavoriteHoverWithinTable, cssFavoriteHoverWithinListItem } from '@kbn/favorites-poc-plugin/public';

// For tables
<EuiTable css={cssFavoriteHoverWithinTable(euiTheme)}>

// For list items
<EuiListGroup css={cssFavoriteHoverWithinListItem(euiTheme)}>
```

## Development

### Running Tests

```bash
# Run Jest tests
yarn test:jest src/plugins/favorites_poc

# Run type checks
yarn type-check --project src/plugins/favorites_poc/tsconfig.json
```

### Building

The plugin is automatically built as part of the Kibana build process.

## Future Enhancements

- **Phase 2**: Discover Home Page with favorited saved searches
- **Phase 3**: Personalized Kibana Home Page with cross-app favorites
- **Enhanced persistence**: Better error handling and offline support
- **Performance optimizations**: Caching and batch operations
- **Additional UI components**: Favorite lists, bulk operations

## Contributing

This is a proof-of-concept plugin. For production use, consider:

1. **Error handling** - Implement proper error boundaries and user feedback
2. **Performance** - Add caching and optimize API calls
3. **Accessibility** - Ensure proper ARIA labels and keyboard navigation
4. **Testing** - Add comprehensive unit and integration tests
5. **Documentation** - Expand API documentation and examples
