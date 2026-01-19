# @kbn/core-chrome-sidebar-context

React context provider and hook for accessing the Sidebar service across Kibana plugins.

## Why This Is a Separate Package

This package exists separately from `@kbn/core-chrome-sidebar` to solve a React context sharing problem in Kibana's plugin architecture.

### The Problem

Kibana's plugin bundling system creates separate instances of package dependencies for each plugin bundle. This breaks React contexts when used across plugins:

```typescript
// ❌ BROKEN: Plugin A and Plugin B get different Context instances

// If context was defined in @kbn/core-chrome-sidebar
const SidebarContext = createContext(null);

// Plugin A (provides the context)
import { SidebarServiceProvider } from '@kbn/core-chrome-sidebar';

// Plugin B (consumes the context)
import { useSidebarService } from '@kbn/core-chrome-sidebar';

// Result: useSidebarService() in Plugin B returns null because
// it's looking at a different Context instance than Plugin A provided
```

React compares contexts by reference. When each plugin bundle has its own copy of the package, the context instances don't match.

### The Solution

By extracting the context into a separate package (`@kbn/core-chrome-sidebar-context`) and including it in Kibana's shared dependencies (`kbn-ui-shared-deps-src`), all plugins receive the **same instance** of this package at runtime.

```typescript
// ✅ WORKS: All plugins share the same Context instance

// Plugin A (provides the context via core)
// Uses @kbn/core-chrome-sidebar-context from shared deps

// Plugin B (consumes the context)
import { useSidebarService } from '@kbn/core-chrome-sidebar-context';

// Result: useSidebarService() correctly accesses the context
// provided by Plugin A because both use the same shared instance
```

## Usage

```typescript
import { SidebarServiceProvider, useSidebarService } from '@kbn/core-chrome-sidebar-context';

// In a provider (typically in core)
<SidebarServiceProvider value={{ sidebar }}>
  {children}
</SidebarServiceProvider>

// In a consumer (any plugin)
const sidebar = useSidebarService();
sidebar.open('myApp');
```

## Important

This package is intentionally minimal - it only contains the React context and related hooks. The actual Sidebar service implementation lives in `@kbn/core-chrome-sidebar`. This separation ensures the context can be shared while keeping the implementation details in the main package.
