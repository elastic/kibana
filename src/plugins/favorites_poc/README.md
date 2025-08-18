# Favorites POC Plugin

A proof of concept for a reusable Favorites service across Kibana applications, demonstrating how to build a unified favorites system that can be extended across different object types and applications.

## Overview

This POC implements a lightweight favorites service that can be used across Kibana applications to provide consistent favoriting functionality. The service is designed to be extensible and can adapt to existing features while providing a unified user experience.

## Features

### Core Service
- **FavoritesService**: Lightweight service with saved object backing
- **FavoriteStarButton**: Reusable star button component with animations
- **Session Persistence**: In-memory cache for graceful error handling
- **Type Safety**: Full TypeScript support with proper interfaces

### Enhanced Components
- **SavedObjectFinder**: Enhanced with tabbed UI (All/Starred tabs)
- **Real-time Updates**: Items disappear immediately when unfavorited
- **Smooth Animations**: Star burst effects only on user interactions
- **Consistent UX**: Matches existing Kibana patterns

### Integration Examples
- **Discover**: Integrated into "Open Discover session" flyout
- **Dashboard**: Extended existing listing with new service
- **Cross-app Consistency**: Same behavior across applications

## Architecture

### Plugin Structure
```
src/plugins/favorites_poc/
├── public/
│   ├── components/
│   │   └── favorite_star_button.tsx
│   ├── services/
│   │   └── favorites_service.ts
│   └── plugin.tsx
├── server/
│   └── plugin.ts
└── kibana.jsonc
```

### Service API
```typescript
interface FavoritesService {
  isFavorite(type: string, id: string): Promise<boolean>;
  toggleFavorite(type: string, id: string): Promise<boolean>;
  getFavorites(): Promise<{ favoriteIds: string[] }>;
  configureForApp(appName: string, contentType: string): FavoritesService;
}
```

### Component API
```typescript
interface FavoriteStarButtonProps {
  type: string;
  id: string;
  favoritesService: FavoritesService;
  onFavoriteChange?: (isFavorite: boolean) => void;
  alwaysShow?: boolean;
  className?: string;
}
```

## Usage

### Basic Star Button
```typescript
import { FavoriteStarButton } from '@kbn/favorites-poc-plugin/public';

<FavoriteStarButton
  type="dashboard"
  id="dashboard-123"
  favoritesService={favoritesService}
  onFavoriteChange={(isFavorite) => {
    console.log('Favorite status changed:', isFavorite);
  }}
/>
```

### Enhanced SavedObjectFinder
```typescript
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';

<SavedObjectFinder
  favoritesService={configuredFavoritesService}
  showTabbedUI={true} // Enable All/Starred tabs
  // ... other props
/>
```

### Service Configuration
```typescript
const configuredService = favoritesService.configureForApp('discover', 'search');
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

## Development

### Running Tests
```bash
yarn test:jest --plugin favorites_poc
```

### Type Checking
```bash
yarn type-check --project src/plugins/favorites_poc/tsconfig.json
```

## Future Enhancements

### TableListView Integration
**Potential Future Enhancement**: Consider integrating `TableListView` into `SavedObjectFinder` for a more unified table experience across Kibana.

#### Benefits:
- **Consistent UX**: Same table patterns across all Kibana applications
- **Enhanced Features**: Better pagination, advanced filtering, sorting, bulk operations
- **Built-in Favorites**: Leverage existing favorites support in TableListView
- **Developer Experience**: Type-safe, consistent API patterns

#### Implementation Options:
1. **Gradual Migration**: Add `useTableListView` prop to SavedObjectFinder
2. **New Component**: Create `SavedObjectFinderWithTableListView`
3. **Enhanced Version**: Build enhanced SavedObjectFinder with TableListView features

#### Migration Path:
1. Add TableListView as an option in SavedObjectFinder
2. Make it default for new implementations
3. Gradually migrate existing usage
4. Deprecate old implementation

This enhancement would provide a more powerful and consistent table experience while maintaining backward compatibility.

### Content Insights for Saved Searches
**Future Enhancement**: Add content insights functionality to the Discover "View details" flyout to show usage analytics.

#### Current Status:
- ✅ **"Created by" information** - Available and implemented
- ✅ **"Updated by" information** - Available and implemented  
- ✅ **Creation/update dates** - Available and implemented
- ❌ **Usage analytics chart** - Not yet available for saved searches

#### Implementation Plan:
1. **Content Insights Client**: Extend `ContentInsightsClient` to support `domainId: 'search'` or `domainId: 'discover'`
2. **Activity Section**: Add 90-day usage chart to "View details" flyout
3. **Analytics Tracking**: Implement view tracking for saved searches
4. **Performance Metrics**: Add usage statistics and trends

#### Benefits:
- **Usage Analytics**: Understand which saved searches are most popular
- **User Insights**: Track engagement patterns
- **Content Optimization**: Identify unused or underutilized searches
- **Consistent UX**: Match Dashboard's activity section functionality

#### Technical Requirements:
- Content insights service support for saved searches
- Analytics tracking for saved search views
- Performance considerations for chart rendering
- Proper error handling for missing analytics data

## Contributing

This is a proof of concept and not intended for production use. The code demonstrates architectural patterns and integration approaches for building reusable favorites functionality across Kibana applications.
