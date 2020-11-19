- [Organisational Conventions](#organisational-conventions)
  - [Definition of done](#definition-of-done)
- [Technical Conventions](#technical-conventions)
  - [Plugin Structure](#plugin-structure)
    - [The PluginInitializer](#the-plugininitializer)
    - [The Plugin class](#the-plugin-class)
    - [Applications](#applications)
    - [Services](#services)
    - [Usage Collection](#usage-collection)
    - [Saved Objects Types](#saved-objects-types)
  - [Naming conventions](#naming-conventions)

## Organisational Conventions
### Definition of done
Definition of done for a feature:
- has a dedicated Github issue describing problem space
- an umbrella task closed/updated with follow-ups
- all code review comments are resolved
- has been verified manually by at least one reviewer
- can be used by first & third party plugins
- there is no contradiction between client and server API
- works for OSS version
   - works with and without a `server.basePath` configured
   - cannot crash the Kibana server when it fails
- works for the commercial version with a license
   - for a logged-in user
   - for anonymous user
   - compatible with Spaces
- has unit & integration tests for public contracts
- has functional tests for user scenarios
- uses standard tooling:
    - code - `TypeScript`
    - UI - `React`
    - tests - `jest` & `FTR`
- has documentation for the public contract, provides a usage example

## Technical Conventions
### Plugin Structure

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
    ├── saved_objects
    │   ├── index.ts
    │   └── my_type.ts
    ├── services
    │   ├── my_service
    │   │   └── index.ts
    │   └── index.ts
    ├── index.ts
    └── plugin.ts
```
- [Manifest file](/docs/development/core/server/kibana-plugin-core-server.pluginmanifest.md) should be defined on top level.
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

#### The PluginInitializer

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

#### The Plugin class

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

#### Applications

It's important that UI code is not included in the main bundle for your plugin. Our webpack configuration supports
dynamic async imports to split out imports into a separate bundle. Every app's rendering logic and UI code should
leverage this pattern.

```tsx
// my_plugin/public/applications/my_app.ts

import React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart, AppMountParameters } from 'src/core/public';

import { MyAppRoot } from './components/app.ts';

/**
 * This module will be loaded asynchronously to reduce the bundle size of your plugin's main bundle.
 */
export const renderApp = (
  core: CoreStart,
  deps: MyPluginDepsStart,
  { element, history }: AppMountParameters
) => {
  ReactDOM.render(<MyAppRoot core={core} deps={deps} routerHistory={history} />, element);
  return () => ReactDOM.unmountComponentAtNode(element);
};
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

Prefer the pattern shown above, using `core.getStartServices()`, rather than store local references retrieved from `start`. 

**Bad:**
```ts
export class MyPlugin implements Plugin {
 // Anti pattern
  private coreStart?: CoreStart;
  private depsStart?: DepsStart;  

  public setup(core) {
    core.application.register({
      id: 'my-app',
      async mount(params) {
        const { renderApp } = await import('./application/my_app');
        // Anti pattern - use `core.getStartServices()` instead!
        return renderApp(this.coreStart, this.depsStart, params);
      }
    });
  }  

  public start(core, deps) {
    // Anti pattern
    this.coreStart = core;
    this.depsStart = deps;
  }
}
```

The main reason to prefer the provided async accessor, is that it doesn't requires the developer to understand and reason about when that function can be called. Having an API that fails sometimes isn't a good API design, and it makes accurately testing this difficult.

#### Services

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

#### Usage Collection

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

#### Saved Objects Types

Saved object type definitions should be defined in their own `server/saved_objects` directory.

The folder should contain a file per type, named after the snake_case name of the type, and an `index.ts` file exporting all the types.

```typescript
// src/plugins/my-plugin/server/saved_objects/my_type.ts
import { SavedObjectsType } from 'src/core/server';

export const myType: SavedObjectsType = {
  name: 'my-type',
  hidden: false,
  namespaceType: 'single',
  mappings: {
    properties: {
      someField: {
        type: 'text',
      },
      anotherField: {
        type: 'text',
      },
    },
  },
  migrations: {
    '1.0.0': migrateFirstTypeToV1,
    '2.0.0': migrateFirstTypeToV2,
  },
};
```

```typescript
// src/plugins/my-plugin/server/saved_objects/index.ts

export { myType } from './my_type';
```

Migration example from the legacy format is available in `src/core/MIGRATION_EXAMPLES.md#saved-objects-types`

### Naming conventions

Export start and setup contracts as `MyPluginStart` and `MyPluginSetup`. 
This avoids naming clashes, if everyone exported them simply as `Start` and `Setup`.
