# @kbn/react-context-registry

Utility for creating React Context instances that are shared across plugin bundles in Kibana.

## The Problem

Kibana's plugin bundling system creates a separate instance of each package dependency for every plugin. This breaks React contexts when shared across plugins:

```typescript
// ❌ BROKEN: Plugin A and Plugin B get different Context instances

// Package with context @kbn/some-react-package
import { createContext } from 'react';
export const SomeContext = createContext<SomeContextValue>(null);
export const SomeContextProvider = SomeContext.Provider;

// Plugin A imports the package and configured the Provider
import { SomeContextProvider } from '@kbn/some-react-package';

// Plugin B imports the package and uses the Consumer
import { SomeContext } from '@kbn/some-react-package';

// Result: Provider in Plugin A doesn't connect to Consumer in Plugin B
```

React compares contexts by reference. When each plugin bundle has its own instance, they don't match.

## The Solution

`@kbn/react-context-registry` maintains a global registry. When multiple plugins request the same context by name, they all get the same instance:

```typescript
// ✅ WORKS: All plugins get the same Context instance

// Package with context @kbn/some-react-package
import { getOrCreateContext } from '@kbn/react-context-registry';
export const SomeContext = getOrCreateContext<SomeContextValue>('SomeContext');
export const SomeContextProvider = SomeContext.Provider;

// Plugin A imports the package and configures the Provider
import { SomeContextProvider } from '@kbn/some-react-package';

// Plugin B imports the package and uses the Consumer
import { SomeContext } from '@kbn/some-react-package';

// Result: Provider in Plugin A connects to Consumer in Plugin B ✅
```
