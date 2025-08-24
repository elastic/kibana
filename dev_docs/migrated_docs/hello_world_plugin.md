---
id: kibHelloWorldApp
slug: /kibana-dev-docs/getting-started/hello-world-app
title: Hello World
description: Build a very basic plugin that registers an application that says "Hello World!".
date: 2025-08-21
tags: ['kibana', 'dev', 'contributor', 'tutorials']
---

Build your first Kibana plugin with this step-by-step tutorial. You'll create a minimal plugin that registers an application displaying "Hello World!" in the Kibana interface.

## Prerequisites

**Development Environment Setup:**
- [Node.js environment configured](setting_up_a_development_env.md)
- Kibana repository cloned and bootstrapped
- Basic TypeScript/React knowledge

**Reference Implementation:**
[examples/hello_world](https://github.com/elastic/kibana/tree/main/examples/hello_world) - Complete working example

## Manual Implementation (Recommended)

This approach teaches the fundamentals of Kibana plugin architecture with minimal code.

### Step 1: Create Plugin Structure

```bash
# Navigate to examples directory
cd examples
mkdir hello_world
cd hello_world
```

### Step 2: Configure Plugin Manifest

Create `kibana.jsonc` with plugin metadata:

```json
{
  "type": "plugin",
  "id": "@kbn/hello-world-plugin",
  "owner": "@elastic/kibana-core",
  "description": "A plugin which registers a very simple hello world application.",
  "plugin": {
    "id": "helloWorld",
    "server": false,
    "browser": true,
    "requiredPlugins": ["developerExamples"]
  }
}
```

**Key Configuration:**
- `id`: Unique plugin identifier used internally
- `server: false`: Client-side only plugin
- `browser: true`: Runs in browser environment
- `requiredPlugins`: Dependencies (developerExamples for navigation integration)

### Step 3: Configure TypeScript

Create `tsconfig.json` for type checking:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "target/types"
  },
  "include": [
    "index.ts",
    "common/**/*.ts",
    "public/**/*.ts",
    "public/**/*.tsx",
    "server/**/*.ts",
    "../../typings/**/*"
  ],
  "exclude": ["target/**/*"],
  "kbn_references": ["@kbn/core", "@kbn/developer-examples-plugin"]
}
```

**Important Elements:**
- Extends base Kibana TypeScript configuration
- `kbn_references`: Explicit dependencies for type checking
- Includes pattern matches plugin file structure

### Step 4: Implement Plugin Class

Create `public/plugin.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

export class HelloWorldPlugin implements Plugin<void, void, SetupDeps> {
  public setup(core: CoreSetup, deps: SetupDeps) {
    // Register application in Kibana navigation
    core.application.register({
      id: 'helloWorld',
      title: 'Hello World',
      async mount({ element }: AppMountParameters) {
        // Render React component when app is mounted
        ReactDOM.render(
          <div data-test-subj="helloWorldDiv">Hello World!</div>, 
          element
        );
        
        // Return cleanup function
        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });

    // Register with developer examples (for navigation)
    deps.developerExamples.register({
      appId: 'helloWorld',
      title: 'Hello World Application',
      description: `Build a plugin that registers an application that simply says "Hello World"`,
    });
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
```

**Plugin Lifecycle Explained:**

**Setup Phase (Registration):**
- Register applications using `core.application.register()`
- Configure navigation and UI elements
- Set up dependencies and services

**Mount Function:**
- Called when user navigates to your app
- Receives DOM element to render into
- Must return cleanup function for unmounting

**Lifecycle Methods:**
- `setup()`: Registration and configuration
- `start()`: Runtime initialization
- `stop()`: Cleanup when Kibana shuts down

### Step 5: Create Plugin Entry Point

Create `public/index.ts`:

```typescript
import { HelloWorldPlugin } from './plugin';

export function plugin() {
  return new HelloWorldPlugin();
}
```

**Export Pattern:**
- Default export function named `plugin`
- Returns instance of your plugin class
- Kibana calls this function to instantiate your plugin

### Step 6: Build and Run

```bash
# Install dependencies and build plugin
yarn kbn bootstrap

# Terminal 1: Start Elasticsearch
yarn es snapshot --license trial

# Terminal 2: Start Kibana with examples
yarn start --run-examples
```

**Access Your Plugin:**
1. Navigate to http://localhost:5601
2. Find "Hello World" in the left navigation (bottom of developer examples section)
3. Click to see your "Hello World!" message

## Plugin Generator (Alternative)

> [!WARNING]
> Plugin generator is currently outdated. Generated code requires manual fixes. Use manual implementation above for reliable results.

**For reference only:**

```bash
node scripts/generate_plugin hello_world
# Follow interactive prompts
# Choose: Kibana Example, UI plugin, no server plugin
```

**Generated Structure:**
- Includes additional boilerplate code
- Provides more complex examples
- May require updates to work with current Kibana version

## Development Tips

### Enhanced Hello World Example

```typescript
// More sophisticated mount function
async mount({ element, appBasePath, history }: AppMountParameters) {
  // Import React app asynchronously (code splitting)
  const { renderApp } = await import('./application');
  
  // Render with proper routing support
  return renderApp(element, { basePath: appBasePath, history });
}

// In application.tsx
export const renderApp = (element: HTMLElement, { basePath, history }) => {
  ReactDOM.render(
    <Router history={history}>
      <div>
        <h1>Hello World!</h1>
        <p>Current path: {history.location.pathname}</p>
        <p>Base path: {basePath}</p>
      </div>
    </Router>,
    element
  );
  
  return () => ReactDOM.unmountComponentAtNode(element);
};
```

### Plugin Testing

```typescript
// Add to plugin.tsx for testing
async mount({ element }: AppMountParameters) {
  ReactDOM.render(
    <div>
      <h1 data-test-subj="helloWorldTitle">Hello World!</h1>
      <button 
        data-test-subj="helloWorldButton"
        onClick={() => alert('Button clicked!')}
      >
        Click me!
      </button>
    </div>, 
    element
  );
  
  return () => ReactDOM.unmountComponentAtNode(element);
}
```

**Functional Test Example:**
```typescript
// test/functional/hello_world.ts
export default function({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  
  describe('Hello World Plugin', () => {
    it('should display hello world message', async () => {
      await testSubjects.existsOrFail('helloWorldTitle');
      const title = await testSubjects.getVisibleText('helloWorldTitle');
      expect(title).to.be('Hello World!');
    });
  });
}
```

### Plugin File Structure

```
hello_world/
├── kibana.jsonc          # Plugin manifest
├── tsconfig.json         # TypeScript configuration
└── public/
    ├── index.ts          # Plugin entry point
    ├── plugin.tsx        # Main plugin class
    └── application/      # (Optional) App components
        ├── index.tsx
        └── components/
```

**Best Practices:**
- Keep plugin class minimal - move complex logic to separate modules
- Use async imports for better performance
- Follow Kibana naming conventions (`data-test-subj` for testing)
- Implement proper error handling and loading states

### Common Issues and Solutions

**Plugin Not Appearing:**
```bash
# Check plugin is properly registered
yarn kbn bootstrap
grep -r "helloWorld" target/  # Should find compiled references
```

**TypeScript Errors:**
```bash
# Clear TypeScript cache
node scripts/type_check.js --clean-cache
```

**React Errors:**
- Ensure `data-test-subj` attributes for testability
- Use React 17+ patterns (no need for React import in JSX files)
- Handle mount/unmount lifecycle properly

### Next Steps

**Expand Your Plugin:**
1. Add routing with React Router
2. Create multiple pages/views
3. Integrate with Kibana services (notifications, HTTP client)
4. Add server-side functionality
5. Implement saved objects for persistence

**Learn More:**
- [Plugin Architecture](anatomy_of_a_plugin.md)
- [Core Services](kibana_platform_plugin_intro.md)
- [Navigation](navigation.md)

**Example Plugins to Study:**
- [examples/dashboard_embeddable](https://github.com/elastic/kibana/tree/main/examples/dashboard_embeddable)
- [examples/routing_example](https://github.com/elastic/kibana/tree/main/examples/routing_example)
- [examples/state_containers_example](https://github.com/elastic/kibana/tree/main/examples/state_containers_example)