# Kibana Conventions

- [Plugin Structure](#plugin-structure)

## Plugin Structure

All Kibana plugins built at Elastic should follow the same structure.

```
my_plugin/
├── kibana.json
├── public
│   ├── applications
│   │   ├── my_app
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── services
│   │   ├── my_service
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── index.ts
│   └── plugin.ts
└── server
    ├── routes
    │   └── index.ts
    ├── collectors
    │   └── register.ts
    ├── services
    │   ├── my_service
    │   │   └── index.ts
    │   └── index.ts
    ├── index.ts
    └── plugin.ts
```
- Both `server` and `public` should have an `index.ts` and a `plugin.ts` file:
  - `index.ts` should only contain:
    - The `plugin` export
    - The `config` export (server only, optional)
    - Type exports for your Setup and Start interfaces, and any relevant sub-types
    - Static, pure exports to be consumed by other plugins
  - `plugin.ts` should only export a single class that implements the `Plugin` interface (more details below)
- UI applications should live as modules inside the `applications` directory.
  - Applications should export a single `renderApp` function.
  - Applications should be loaded using dynamic async imports (more details below)
  - If there is only a single application, this directory can be called `application` that exports the `renderApp` function.
- Services provided to other plugins as APIs should live inside the `services` subdirectory.
  - Services should model the plugin lifecycle (more details below).
- HTTP routes should be contained inside the `server/routes` directory.
  - More should be fleshed out here...
- Usage collectors for Telemetry should be defined in a separate `server/collectors/` directory.

### The PluginInitializer

```ts
// my_plugin/public/index.ts

import { PluginInitializer } from '../../src/core/public';
import { MyPlugin, MyPluginSetup, MyPluginStart } from './plugin';

export const plugin: PluginInitializer<MyPluginSetup, MyPluginStart> = () => new MyPlugin();
export {
  MyPluginSetup,
  MyPluginStart
}
```

### The Plugin class

```ts
// my_plugin/public/plugin.ts

import { CoreSetup, CoreStart, Plugin } from '../../src/core/public';
import { OtherPluginSetup, OtherPluginStart } from '../other_plugin';
import { ThirdPluginSetup, ThirdPluginStart } from '../third_plugin';

export interface MyPluginSetup {
  registerThing(...);
}

export interface MyPluginStart {
  getThing(): Thing;
}

export interface MyPluginSetupDeps {
  otherPlugin: OtherPluginSetup;
  thirdPlugin?: ThirdPluginSetup;  // Optional dependency
}

export interface MyPluginStartDeps {
  otherPlugin: OtherPluginStart;
  thirdPlugin?: ThirdPluginStart;  // Optional dependency
}

export class MyPlugin implements Plugin<
  // All of these types are optional. If your plugin does not expose anything
  // or depend on other plugins, these can be omitted.
  MyPluginSetup,
  MyPluginStart,
  MyPluginSetupDeps,
  MyPluginStartDeps,
> {

  public setup(core: CoreSetup, plugins: MyPluginSetupDeps) {
    // should return a value that matches `MyPluginSetup`
  }

  public start(core: CoreStart, plugins: MyPluginStartDeps) {
    // should return a value that matches `MyPluginStart`
  }

  public stop() { ... }
}
```

Difference between `setup` and `start`:
- `setup` is reserved for "registration" work
- `start` is where any "running" logic for your plugin would live. This only applies if you need to start listening for
  outside events (polling for work, listening on a port, etc.)

The bulk of your plugin logic will most likely live inside _handlers_ registered during `setup`.

### Applications

It's important that UI code is not included in the main bundle for your plugin. Our webpack configuration supports
dynamic async imports to split out imports into a separate bundle. Every app's rendering logic and UI code should
leverage this pattern.

```tsx
// my_plugin/public/applications/my_app.ts

import React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart, AppMountParams } from '../../src/core/public';

import { MyAppRoot } from './components/app.ts';

/**
 * This module will be loaded asynchronously to reduce the bundle size of your plugin's main bundle.
 */
export const renderApp = (core: CoreStart, deps: MyPluginDepsStart, { element, appBasePath }: AppMountParams) => {
  ReactDOM.render(<MyAppRoot core={core} deps={deps} routerBasePath={appBasePath} />, element);
  return () => ReactDOM.unmountComponentAtNode(element);
}
```

```ts
// my_plugin/public/plugin.ts

import { Plugin } from '../../src/core/public';

export class MyPlugin implements Plugin {
  public setup(core) {
    core.application.register({
      id: 'my-app',
      async mount(params) {
        // Load application bundle
        const { renderApp } = await import('./application/my_app');
        // Get start services
        const [coreStart, depsStart] = core.getStartServices();
        return renderApp(coreStart, depsStart, params);
      }
    });
  }
}
```

### Services

Service structure should mirror the plugin lifecycle to make reasoning about how the service is executed more clear.

```ts
// my_plugin/public/services/my_service.ts

export class MyService {
  private readonly strings$ = new BehaviorSubject<string[]>();

  public setup() {
    return {
      registerStrings: (newString: string) =>
        this.strings$.next([...this.strings$.value, newString]);
    }
  }

  public start() {
    this.strings$.complete();

    return {
      strings: this.strings$.value
    };
  }
}
```

Constructing and interacting with this service becomes very simple from the top-level Plugin class:

```ts
// my_plugin/public/plugin.ts

import { MyService } from './services';

export class Plugin {
  private readonly myService = new MyService();

  public setup() {
    return {
      myService: myService.setup();
    }
  }

  public start() {
    return {
      myService: myService.start();
    }
  }
}
```

### Usage Collection

For creating and registering a Usage Collector. Collectors should be defined in a separate directory `server/collectors/`. You can read more about usage collectors on `src/plugins/usage_collection/README.md`.

```ts
// server/collectors/register.ts
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';

export function registerMyPluginUsageCollector(usageCollection?: UsageCollectionSetup): void {
  // usageCollection is an optional dependency, so make sure to return if it is not registered.
  if (!usageCollection) {
    return;
  }

  // create usage collector
  const myCollector = usageCollection.makeUsageCollector({
    type: MY_USAGE_TYPE,
    fetch: async (callCluster: CallCluster) => {

    // query ES and get some data
    // summarize the data into a model
    // return the modeled object that includes whatever you want to track

      return {
        my_objects: {
          total: SOME_NUMBER
        }
      };
    },
  });

  // register usage collector
  usageCollection.registerCollector(myCollector);
}
```

### Naming conventions

Export start and setup contracts as `MyPluginStart` and `MyPluginSetup`. 
This avoids naming clashes, if everyone exported them simply as `Start` and `Setup`.
