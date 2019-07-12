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
- HTTP routes should be contained inside the `routes` directory.
  - More should be fleshed out here...

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
import { ApplicationMountContext } from '../../src/core/public';

import { MyAppRoot } from './components/app.ts';

/**
 * This module will be loaded asynchronously to reduce the bundle size of your plugin's main bundle.
 */
export const renderApp = (context: ApplicationMountContext, domElement: HTMLDivElement) => {
  ReactDOM.render(<MyAppRoot context={context} />, domElement);
  return () => ReactDOM.unmountComponentAtNode(domElement);
}
```

```ts
// my_plugin/public/plugin.ts

import { Plugin } from '../../src/core/public';

export class MyPlugin implements Plugin {
  public setup(core) {
    core.application.register({
      id: 'my-app',
      async mount(context, domElement) {
        // Load application bundle
        const { renderApp } = await import('./application/my_app');
        return renderApp(context, domElement);
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
