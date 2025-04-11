---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/kibana-platform-plugin-api.html
applies_to:
  product: preview
---

# Kibana Plugin API [kibana-platform-plugin-api]

{{kib}} platform plugins are a significant step toward stabilizing {{kib}} architecture for all the developers. We made sure plugins could continue to use most of the same technologies they use today, at least from a technical perspective.

## Anatomy of a plugin [_anatomy_of_a_plugin]

Plugins are defined as classes and present themselves to {{kib}} through a simple wrapper function. A plugin can have browser-side code, server-side code, or both. There is no architectural difference between a plugin in the browser and a plugin on the server. In both places, you describe your plugin similarly, and you interact with Core and other plugins in the same way.

The basic file structure of a {{kib}} plugin named `demo` that has both client-side and server-side code would be:

```text
plugins/
  demo
    kibana.json [1]
    public
      index.ts  [2]
      plugin.ts [3]
    server
      index.ts  [4]
      plugin.ts [5]
```

**[1] `kibana.json`** is a static manifest file that is used to identify the plugin and to specify if this plugin has server-side code, browser-side code, or both:

```json
{
  "id": "demo",
  "version": "kibana",
  "server": true,
  "ui": true
}
```

Learn about the [manifest file format](https://github.com/elastic/kibana/blob/master/src/core/packages/plugins/server/src/types.ts).

::::{note}
`package.json` files are irrelevant to and ignored by {{kib}} for discovering and loading plugins.
::::


**[2] `public/index.ts`** is the entry point into the client-side code of this plugin. It must export a function named `plugin`, which will receive [a standard set of core capabilities](https://github.com/elastic/kibana/blob/master/src/core/packages/plugins/browser/src/plugin_initializer.ts) as an argument. It should return an instance of its plugin class for {{kib}} to load.

```typescript
import type { PluginInitializerContext } from '@kbn/core/server';
import { MyPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new MyPlugin(initializerContext);
}
```

**[3] `public/plugin.ts`** is the client-side plugin definition itself. Technically speaking, it does not need to be a class or even a separate file from the entry point, but *all plugins at Elastic* should be consistent in this way. See all [conventions for first-party Elastic plugins](https://github.com/elastic/kibana/blob/master/src/core/CONVENTIONS.md).

```typescript
import type { Plugin, PluginInitializerContext, CoreSetup, CoreStart } from '@kbn/core/server';

export class MyPlugin implements Plugin {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    // called when plugin is setting up during Kibana's startup sequence
  }

  public start(core: CoreStart) {
    // called after all plugins are set up
  }

  public stop() {
    // called when plugin is torn down during Kibana's shutdown sequence
  }
}
```

**[4] `server/index.ts`** is the entry-point into the server-side code of this plugin. [It is identical](https://github.com/elastic/kibana/blob/master/src/core/packages/plugins/server/src/types.ts) in almost every way to the client-side entry-point:

```typescript
import type { PluginInitializerContext } from '@kbn/core/server';

export async function plugin(initializerContext: PluginInitializerContext) {
  const { MyPlugin } = await import('./plugin');
  return new MyPlugin(initializerContext);
}
```

**[5] `server/plugin.ts`** is the server-side plugin definition. The shape of this plugin is the same as it’s client-side counter-part:

```typescript
import type { Plugin, PluginInitializerContext, CoreSetup, CoreStart } from '@kbn/core/server';

export class MyPlugin implements Plugin {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    // called when plugin is setting up during Kibana's startup sequence
  }

  public start(core: CoreStart) {
    // called after all plugins are set up
  }

  public stop() {
    // called when plugin is torn down during Kibana's shutdown sequence
  }
}
```

{{kib}} does not impose any technical restrictions on how the the internals of a plugin are architected, though there are certain considerations related to how plugins integrate with core APIs and APIs exposed by other plugins that may greatly impact how they are built.


## Lifecycles & Core Services [plugin-lifecycles]

The various independent domains that makeup `core` are represented by a series of services and many of those services expose public interfaces that are provided to all plugins. Services expose different features at different parts of their lifecycle. We describe the lifecycle of core services and plugins with specifically-named functions on the service definition.

{{kib}} has three lifecycles: `setup`, `start`, and `stop`. Each plugin’s `setup` functions is called sequentially while Kibana is setting up on the server or when it is being loaded in the browser. The `start` functions are called sequentially after `setup` has been completed for all plugins. The `stop` functions are called sequentially while Kibana is gracefully shutting down the server or when the browser tab or window is being closed.

The table below explains how each lifecycle relates to the state of Kibana.

| lifecycle | purpose | server | browser |
| --- | --- | --- | --- |
| *setup* | perform "registration" work to setup environment for runtime | configure REST API endpoint, register saved object types, etc. | configure application routes in SPA, register custom UI elements in extension points, etc. |
| *start* | bootstrap runtime logic | respond to an incoming request, request Elasticsearch server, etc. | start polling Kibana server, update DOM tree in response to user interactions, etc. |
| *stop* | cleanup runtime | dispose of active handles before the server shutdown. | store session data in the LocalStorage when the user navigates away from {{kib}}, etc. |

Conversely, there is no equivalent to `uiExports` in Kibana Platform plugins. As a general rule of thumb, features that were registered via `uiExports` are now registered during the `setup` phase. Most of everything else should move to the `start` phase.

The lifecycle-specific contracts exposed by core services are always passed as the first argument to the equivalent lifecycle function in a plugin. For example, the core `http` service exposes a function `createRouter` to all plugin `setup` functions. To use this function to register an HTTP route handler, a plugin just accesses it off of the first argument:

```typescript
import type { CoreSetup } from '@kbn/core/server';

export class MyPlugin {
  public setup(core: CoreSetup) {
    const router = core.http.createRouter();
    // handler is called when '/path' resource is requested with `GET` method
    router.get({ path: '/path', validate: false }, (context, req, res) => res.ok({ content: 'ok' }));
  }
}
```

Different service interfaces can and will be passed to `setup`, `start`, and `stop` because certain functionality makes sense in the context of a running plugin while other types of functionality may have restrictions or may only make sense in the context of a plugin that is stopping.

For example, the `stop` function in the browser gets invoked as part of the `window.onbeforeunload` event, which means you can’t necessarily execute asynchronous code here reliably. For that reason, `core` likely wouldn’t provide any asynchronous functions to plugin `stop` functions in the browser.

The current lifecycle function for all plugins will be executed before the next lifecycle starts. That is to say that all `setup` functions are executed before any `start` functions are executed.

These are the contracts exposed by the core services for each lifecycle:

| lifecycle | server contract | browser contract |
| --- | --- | --- |
| *constructor* | [PluginInitializerContext](https://github.com/elastic/kibana/blob/master/src/core/packages/plugins/server/src/types.ts) | [PluginInitializerContext](https://github.com/elastic/kibana/blob/master/src/core/packages/plugins/browser/src/plugin_initializer.ts) |
| *setup* | [CoreSetup](https://github.com/elastic/kibana/blob/master/src/core/packages/lifecycle/server/src/core_setup.ts) | [CoreSetup](https://github.com/elastic/kibana/blob/master/src/core/packages/lifecycle/browser-internal/src/internal_core_setup.ts) |
| *start* | [CoreStart](https://github.com/elastic/kibana/blob/master/src/core/packages/lifecycle/server/src/core_start.ts) | [CoreStart](https://github.com/elastic/kibana/blob/master/src/core/packages/lifecycle/browser/src/core_start.ts) |


## Integrating with other plugins [_integrating_with_other_plugins]

Plugins can expose public interfaces for other plugins to consume. Like `core`, those interfaces are bound to the lifecycle functions `setup` and/or `start`.

Anything returned from `setup` or `start` will act as the interface, and while not a technical requirement, all first-party Elastic plugins will expose types for that interface as well. Third party plugins wishing to allow other plugins to integrate with it are also highly encouraged to expose types for their plugin interfaces.

**foobar plugin.ts:**

```typescript
import type { Plugin } from '@kbn/core/server';
export interface FoobarPluginSetup { <1>
  getFoo(): string;
}

export interface FoobarPluginStart { <1>
  getBar(): string;
}

export class MyPlugin implements Plugin<FoobarPluginSetup, FoobarPluginStart> {
  public setup(): FoobarPluginSetup {
    return {
      getFoo() {
        return 'foo';
      },
    };
  }

  public start(): FoobarPluginStart {
    return {
      getBar() {
        return 'bar';
      },
    };
  }
}
```

1. We highly encourage plugin authors to explicitly declare public interfaces for their plugins.


Unlike core, capabilities exposed by plugins are *not* automatically injected into all plugins. Instead, if a plugin wishes to use the public interface provided by another plugin, it must first declare that plugin as a dependency in it’s [`kibana.json`](https://github.com/elastic/kibana/blob/master/src/core/packages/plugins/server/src/types.ts) manifest file.

**demo kibana.json:**

```json
{
  "id": "demo",
  "requiredPlugins": ["foobar"],
  "server": true,
  "ui": true
}
```

With that specified in the plugin manifest, the appropriate interfaces are then available via the second argument of `setup` and/or `start`:

**demo plugin.ts:**

```typescript
import type { CoreSetup, CoreStart } from '@kbn/core/server';
import type { FoobarPluginSetup, FoobarPluginStart } from '../../foobar/server';

interface DemoSetupPlugins { <1>
  foobar: FoobarPluginSetup;
}

interface DemoStartPlugins {
  foobar: FoobarPluginStart;
}

export class AnotherPlugin {
  public setup(core: CoreSetup, plugins: DemoSetupPlugins) { <2>
    const { foobar } = plugins;
    foobar.getFoo();
    // 'foo'
    foobar.getBar();
    // throws because getBar does not exist
  }

  public start(core: CoreStart, plugins: DemoStartPlugins) { <3>
    const { foobar } = plugins;
    foobar.getFoo();
    // throws because getFoo does not exist
    foobar.getBar();
    // 'bar'
  }

  public stop() {}
}
```

1. The interface for plugin's dependencies must be manually composed. You can do this by importing the appropriate type from the plugin and constructing an interface where the property name is the plugin's ID.
2. These manually constructed types should then be used to specify the type of the second argument to the plugin.
3. Notice that the type for the setup and start lifecycles are different. Plugin lifecycle functions can only access the APIs that are exposed *during* that lifecycle.



