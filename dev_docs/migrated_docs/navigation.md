---
id: kibDevKeyConceptsNavigation
slug: /kibana-dev-docs/routing-and-navigation
title: Routing, Navigation and URL
description: Learn best practices about navigation inside Kibana
date: 2025-08-21
tags: ['kibana', 'dev', 'architecture', 'contributor']
---

Kibana provides comprehensive routing and navigation tools for building consistent user experiences. This guide covers deep-linking, inter-app navigation, internal routing, and state management patterns.

## Core Navigation Principles

**Single Page Application (SPA) Rules:**
- Never use `window.location.href` - causes full page reloads
- Always use `core.application.navigateToApp()` or `core.application.navigateToUrl()`
- Wrap links with `RedirectAppLinks` component for automatic SPA navigation
- Use `core`'s `ScopedHistory` instead of browser APIs directly

## Deep-linking Between Apps

### URL Construction with basePath

Always prepend Kibana's `basePath` when building URLs:

```tsx
// ✅ Correct - uses basePath.prepend
const discoverUrl = core.http.basePath.prepend('/discover');
console.log(discoverUrl); // http://localhost:5601/bpr/s/space/app/discover

// ❌ Avoid - hardcoded URLs break in different deployments
const badUrl = 'http://localhost:5601/app/discover';
```

### App Locators (Recommended)

> [!IMPORTANT]
> **Treat app URLs as plugin contracts.** Never hardcode other app's state parameters.

Instead of constructing URLs manually, use app locators:

```tsx
// ❌ Bad - hardcoded state structure
const manualUrl = core.http.basePath.prepend(
  `/discover#/?_g=(filters:!(),time:(from:'2020-09-10T11:39:50.203Z'))&_a=(index:'logs')`
);

// ✅ Good - use app's locator
const discoverUrl = await plugins.discover.locator.getUrl({
  filters,
  timeRange,
  indexPattern: 'logs'
});

// ✅ Direct navigation
await plugins.discover.locator.navigate({filters, timeRange});
```

**Locator Access Methods:**
1. **Plugin contract** (preferred): `plugins.discover.locator`
2. **Share plugin**: For cases without explicit plugin dependency

**Creating Locators for Your App:**
Expose locators in your plugin's public contract. See [Discover locator implementation](src/platform/plugins/shared/discover/public/application/context/services/locator.ts) for reference.

## SPA Navigation APIs

### Core Navigation Methods

```tsx
// Navigate to specific app
core.application.navigateToApp('dashboard', { 
  path: '/my-dashboard' 
});

// Navigate to any URL within Kibana
core.application.navigateToUrl('/app/discover');

// Force page reload (rare cases only)
core.application.navigateToUrl('/app/special', { 
  forceRedirect: true 
});
```

### RedirectAppLinks Component

Automatically converts regular links to SPA navigation:

```jsx
const MyApp = () => (
  <RedirectAppLinks coreStart={{application: core.application}}>
    {/* This link will use SPA navigation automatically */}
    <a href={core.http.basePath.prepend('/app/dashboard')}>
      Go to Dashboard
    </a>
    
    {/* All child links are converted */}
    <nav>
      <a href="/app/discover">Discover</a>
      <a href="/app/visualize">Visualize</a>
    </nav>
  </RedirectAppLinks>
);
```

### Manual Link Handling

```jsx
const MySPALink = () => (
  <a
    href={urlToADashboard}
    onClick={(e) => {
      e.preventDefault();
      core.application.navigateToApp('dashboard', { path: '/my-dashboard' });
    }}
  >
    Go to Dashboard
  </a>
);
```

## Internal App Routing

### React Router Setup

```tsx
import { BrowserRouter } from 'react-router-dom';

// ✅ Use BrowserRouter with core's history
function MyApp({ history }) {
  return (
    <BrowserRouter history={history}>
      <Routes>
        <Route path="/overview" component={Overview} />
        <Route path="/settings" component={Settings} />
      </Routes>
    </BrowserRouter>
  );
}

// ❌ Don't use HashRouter
// ❌ Don't create your own history instance
```

**Key Requirements:**
- Use `BrowserRouter`, never `HashRouter`
- Initialize with `history` from `core` (provided in app mount parameters)
- This ensures `core` tracks internal navigation events

### Internal Navigation Links

```tsx
import { Link } from 'react-router-dom';

// Relative paths resolve to your app's base URL
const MyInternalLink = () => (
  <Link to="/my-other-page">Internal Page</Link>
);
```

**Reference Documentation:**
- [ScopedHistory API](https://github.com/elastic/kibana/blob/main/docs/development/core/public/kibana-plugin-core-public.scopedhistory.md)
- [App mount parameters](https://github.com/elastic/kibana/blob/main/docs/development/core/public/kibana-plugin-core-public.appmountparameters.history.md)
- [Example implementation](https://github.com/elastic/kibana/blob/main/test/plugin_functional/plugins/core_plugin_a/public/application.tsx#L120)

## History and Location Management

> [!WARNING]
> Never use `window.location` or `window.history` directly. Use `core`'s `ScopedHistory` instead.

**Why ScopedHistory is Required:**
- Ensures `core` tracks location changes
- Prevents conflicts with other plugins listening to location events  
- Avoids unpredictable bugs from manual location manipulation

**Common ScopedHistory Use Cases:**
```tsx
// Read/write query parameters
const params = new URLSearchParams(history.location.search);
history.push({ search: '?tab=advanced' });

// Programmatic navigation
history.push('/internal-route');

// Listen to location changes
useEffect(() => {
  const unlisten = history.listen((location) => {
    console.log('Location changed:', location.pathname);
  });
  return unlisten;
}, [history]);
```

## URL State Synchronization

### Rison Format and Query Parameters

Kibana apps traditionally store state in URL query parameters using [rison](https://github.com/w33ble/rison-node#readme) format:

```bash
# Global state (_g) - shared across apps
_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:'2020-09-10T11:39:50.203Z'))

# Application state (_a) - scoped to current app  
_a=(columns:!(_source),index:'logs-*',query:(language:kuery,query:'error'))
```

**Query Parameter Conventions:**
- `_g` (global): Time range, refresh interval, pinned filters
- `_a` (application): App-specific UI state

> [!NOTE]
> The `_g`/`_a` separation is legacy from pre-SPA days. Modern apps can use any URL structure since page reloads no longer occur.

### State Sync Utilities

**When to Use State Sync Utils:**
- Mirror Analyze group apps' URL state patterns
- Support `state:storeInSessionStore` for long URLs
- Implement custom serialization formats
- Mix URL and browser storage state

**When to Avoid:**
- Simple flag or key/value parameters
- Apps with minimal state requirements

> [!IMPORTANT]
> See [state sync documentation](https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/kibana_utils/docs/state_sync/README.md) for implementation details.

## State Preservation Between Apps

### Cross-App State Flow

**Example Navigation Scenario:**
1. Dashboard app with applied filters
2. Navigate to Discover (SPA navigation)
3. Change time filter in Discover  
4. Navigate back to Dashboard
5. Dashboard preserves original state + updated time filter

### Implementation with KbnUrlTracker

Historical approach uses URL-based state tracking:

```tsx
// Navigation links automatically include current global state
<a href={dashboardUrl + globalStateFromCurrentApp}>Dashboard</a>
```

**Global State Updates:**
- Time filters, refresh intervals update in all navigation links
- Pinned filters propagate across apps
- App-specific state remains isolated

**Modern Alternatives:**
> [!NOTE]
> Since SPA navigation eliminates page reloads, simpler state preservation methods may be more appropriate than URL-based approaches.

Reference: [KbnUrlTracker implementation](https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/kibana_utils/public/state_management/url/kbn_url_tracker.ts#L57)

## Navigation APIs Reference

**Core Application APIs:**
- `core.application.navigateToApp(appId, options)` - Navigate to specific app
- `core.application.navigateToUrl(url, options)` - Navigate to any Kibana URL  
- `core.http.basePath.prepend(path)` - Add basePath to URLs

**Options:**
- `forceRedirect: true` - Force full page reload (rare cases)
- `skipUnload: true` - Bypass onAppLeave behavior
- `openInNewTab: true` - Open in new browser tab

**Components:**
- `RedirectAppLinks` - Automatic SPA navigation wrapper
- `ScopedHistory` - Core-managed history instance

**Navigation Guidelines:**
1. Always use SPA navigation APIs
2. Leverage app locators over manual URL construction  
3. Use `RedirectAppLinks` for link-heavy UIs
4. Follow established URL state patterns when appropriate
5. Test navigation flows across different deployment configurations