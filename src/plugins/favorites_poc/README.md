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
- **Discover**: Integrated into "Open Discover session" flyout and new home page
- **Dashboard**: Extended existing listing with new service
- **Cross-app Consistency**: Same behavior across applications

### Discover Home Page
- **New Home Route**: `/list` route with modern `TableListView` integration
- **Tabbed Interface**: "All sessions" and "Starred sessions" tabs
- **Recently Accessed Items**: Side panel showing last 10 recently accessed Discover sessions
- **Smart Navigation**: Proper routing to `/create` for new sessions
- **Breadcrumb Navigation**: Clickable "Discover" → "New session" structure
- **App Menu Integration**: "New session" button routes to new home page structure

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

### Discover Home Page
```typescript
import { DiscoverListing } from '@kbn/discover-plugin/public/discover_listing';

// Route configuration
<Route path="/list">
  <DiscoverListing />
</Route>
```

### Recently Accessed Items Panel
```typescript
import { RecentlyAccessedItemsPanel } from '@kbn/content-management-table-list-view-common';

<RecentlyAccessedItemsPanel
  items={recentlyAccessedItems}
  isLoading={isLoadingRecentlyAccessed}
  error={recentlyAccessedError}
  onItemSelect={handleRecentlyAccessedItemSelect}
  title="Recently accessed"
  filter="discover"
  width={320}
  maxWidth={400}
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

## Implementation Details

### Discover Home Page Architecture
The new Discover home page (`/list`) implements a modern, consistent user experience:

#### Key Components:
- **TableListView**: Shared Kibana component providing advanced table functionality
- **KibanaPageTemplate**: Consistent page layout with header and sections
- **RecentlyAccessedItemsPanel**: Side panel showing recently accessed items
- **Favorites Integration**: Star buttons with real-time updates

#### Navigation Flow:
1. **Home Page** (`/list`): Shows all saved searches with favorites
2. **Create New** (`/create`): Creates new Discover session
3. **View Saved** (`/view/:id`): Opens existing saved search
4. **Breadcrumbs**: "Discover" (clickable) → "New session" or saved search title

#### Smart Routing:
- **New Session**: Routes to `/create` with proper breadcrumb context
- **Saved Search**: Routes to `/view/:id` with full state preservation
- **Recently Accessed**: Uses `services.locator.getRedirectUrl` for proper URL generation

### Recently Accessed Items
The recently accessed items functionality provides quick access to recently used Discover sessions:

#### Features:
- **localStorage Integration**: Uses `services.chrome.recentlyAccessed.get()`
- **Filtering**: Support for `'discover'`, `'dashboard'`, `'all'` filters
- **App Icons**: Shows `discoverApp` or `dashboardApp` icons based on item type
- **Proper Navigation**: Generates correct URLs with all necessary parameters

#### Shared Component:
Located in `@kbn/content-management-table-list-view-common` for reuse across Kibana applications.

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

### Optional UI Telemetry (usageCollection)
An orthogonal enhancement is to wire Kibana's `usageCollection` to report lightweight UI counters (e.g., button clicks, creates, deletes, favorites toggled). This is separate from Content Insights (which aggregates content usage over time) and can be added later without affecting functionality.

Notes:
- Discover does not currently emit UI counters on its listing page.
- If desired, expose `usageCollection` through the app services and invoke `reportUiCounter` on key interactions.
- This can coexist with, but is independent from, Content Insights.

## Completed Features

### Phase 1: Favorites Service (Foundation) ✅
- ✅ **FavoritesService**: Lightweight service with saved object backing
- ✅ **FavoriteStarButton**: Reusable star button component with animations
- ✅ **SavedObjectFinder Enhancement**: Added tabbed UI (All/Starred tabs)
- ✅ **Dashboard Integration**: Star button in Dashboard listing page
- ✅ **Discover Integration**: Star button in "Open session" flyout
- ✅ **Cross-app Functionality**: Works across Dashboard and Discover
- ✅ **Comprehensive Documentation**: Complete README with usage examples

### Phase 2: Discover Home Page ✅
- ✅ **New Discover Home Route**: `/list` route with `TableListView`
- ✅ **TableListView Integration**: Using shared component with "All" and "Starred" tabs
- ✅ **Create/Delete Actions**: Working identically to Dashboard
- ✅ **View Details Action**: Content editor with metadata editing
- ✅ **Smart Navigation**: Proper routing to `/create` for new sessions
- ✅ **KibanaPageTemplate**: Refactored to use consistent page layout
- ✅ **Recently Accessed Items Panel**: Side panel showing recent Discover sessions
- ✅ **Breadcrumb Navigation**: Clickable "Discover" → "New session" structure

### Phase 3: Extend Discover Home Page ✅
- ✅ **Recently Accessed Items**: Panel showing last 10 recently accessed items
- ✅ **Shared Component**: `RecentlyAccessedItemsPanel` in `@kbn/content-management-table-list-view-common`
- ✅ **Filtering**: Support for `'discover'`, `'dashboard'`, `'all'` filters
- ✅ **Proper Navigation**: Uses `services.locator.getRedirectUrl` for Discover items
- ✅ **UI Refinements**: `EuiListGroup` display with app icons
- ✅ **Breadcrumb Fixes**: Always clickable "Discover" breadcrumb
- ✅ **App Menu Integration**: "New session" button routes to `/create`

## Contributing

This is a proof of concept and not intended for production use. The code demonstrates architectural patterns and integration approaches for building reusable favorites functionality across Kibana applications.
