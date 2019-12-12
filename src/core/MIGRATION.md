<<<<<<< HEAD
=======
# Migrating legacy plugins to the new platform

- [Migrating legacy plugins to the new platform](#migrating-legacy-plugins-to-the-new-platform)
  - [Overview](#overview)
    - [Architecture](#architecture)
    - [Services](#services)
    - [Integrating with other plugins](#integrating-with-other-plugins)
    - [Challenges to overcome with legacy plugins](#challenges-to-overcome-with-legacy-plugins)
      - [Challenges on the server](#challenges-on-the-server)
      - [Challenges in the browser](#challenges-in-the-browser)
    - [Plan of action](#plan-of-action)
    - [Shared application plugins](#shared-application-plugins)
  - [Server-side plan of action](#server-side-plan-of-action)
    - [De-couple from hapi.js server and request objects](#de-couple-from-hapijs-server-and-request-objects)
    - [Introduce new plugin definition shim](#introduce-new-plugin-definition-shim)
    - [Switch to new platform services](#switch-to-new-platform-services)
    - [Migrate to the new plugin system](#migrate-to-the-new-plugin-system)
  - [Browser-side plan of action](#browser-side-plan-of-action)
    - [1. Create a plugin definition file](#1-create-a-plugin-definition-file)
    - [2. Export all static code and types from `public/index.ts`](#2-export-all-static-code-and-types-from-publicindexts)
    - [3. Export your runtime contract](#3-export-your-runtime-contract)
    - [4. Move "owned" UI modules into your plugin and expose them from your public contract](#4-move-owned-ui-modules-into-your-plugin-and-expose-them-from-your-public-contract)
    - [5. Provide plugin extension points decoupled from angular.js](#5-provide-plugin-extension-points-decoupled-from-angularjs)
    - [6. Move all webpack alias imports into uiExport entry files](#6-move-all-webpack-alias-imports-into-uiexport-entry-files)
    - [7. Switch to new platform services](#7-switch-to-new-platform-services)
    - [8. Migrate to the new plugin system](#8-migrate-to-the-new-plugin-system)
    - [Bonus: Tips for complex migration scenarios](#bonus-tips-for-complex-migration-scenarios)
  - [Frequently asked questions](#frequently-asked-questions)
    - [Is migrating a plugin an all-or-nothing thing?](#is-migrating-a-plugin-an-all-or-nothing-thing)
    - [Do plugins need to be converted to TypeScript?](#do-plugins-need-to-be-converted-to-typescript)
    - [Can static code be shared between plugins?](#can-static-code-be-shared-between-plugins)
      - [Background](#background)
      - [What goes wrong if I do share modules with state?](#what-goes-wrong-if-i-do-share-modules-with-state)
      - [How to decide what code can be statically imported](#how-to-decide-what-code-can-be-statically-imported)
      - [Concrete Example](#concrete-example)
    - [How can I avoid passing Core services deeply within my UI component tree?](#how-can-i-avoid-passing-core-services-deeply-within-my-ui-component-tree)
    - [How is "common" code shared on both the client and server?](#how-is-common-code-shared-on-both-the-client-and-server)
    - [When does code go into a plugin, core, or packages?](#when-does-code-go-into-a-plugin-core-or-packages)
    - [How do I build my shim for New Platform services?](#how-do-i-build-my-shim-for-new-platform-services)
      - [Client-side](#client-side)
        - [Core services](#core-services)
        - [Plugins for shared application services](#plugins-for-shared-application-services)
      - [Server-side](#server-side)
        - [Core services](#core-services-1)
      - [UI Exports](#ui-exports)
  - [How to](#how-to)
    - [Configure plugin](#configure-plugin)
    - [Mock new platform services in tests](#mock-new-platform-services-in-tests)
      - [Writing mocks for your plugin](#writing-mocks-for-your-plugin)
      - [Using mocks in your tests](#using-mocks-in-your-tests)
      - [What about karma tests?](#what-about-karma-tests)
    - [Provide Legacy Platform API to the New platform plugin](#provide-legacy-platform-api-to-the-new-platform-plugin)
      - [On the server side](#on-the-server-side)
      - [On the client side](#on-the-client-side)

Make no mistake, it is going to take a lot of work to move certain plugins to the new platform. Our target is to migrate the entire repo over to the new platform throughout 7.x and to remove the legacy plugin system no later than 8.0, and this is only possible if teams start on the effort now.

The goal of this document is to guide teams through the recommended process of migrating at a high level. Every plugin is different, so teams should tweak this plan based on their unique requirements.

We'll start with an overview of how plugins work in the new platform, and we'll end with a generic plan of action that can be applied to any plugin in the repo today.

## Overview

Plugins in the new platform are not especially novel or complicated to describe. Our intention wasn't to build some clever system that magically solved problems through abstractions and layers of obscurity, and we wanted to make sure plugins could continue to use most of the same technologies they use today, at least from a technical perspective.

New platform plugins exist in the `src/plugins` and `x-pack/plugins` directories.

### Architecture

Plugins are defined as classes and exposed to the platform itself through a simple wrapper function. A plugin can have browser side code, server side code, or both. There is no architectural difference between a plugin in the browser and a plugin on the server, which is to say that in both places you describe your plugin similarly, and you interact with core and/or other plugins in the same way.

The basic file structure of a new platform plugin named "demo" that had both client-side and server-side code would be:

```tree
src/plugins
  demo
    kibana.json [1]
    public
      index.ts [2]
      plugin.ts [3]
    server
      index.ts [4]
      plugin.ts [5]
```

**[1] `kibana.json`** is a [static manifest](../../docs/development/core/server/kibana-plugin-server.pluginmanifest.md) file that is used to identify the plugin and to determine what kind of code the platform should execute from the plugin:

```json
{
  "id": "demo",
  "version": "kibana",
  "server": true,
  "ui": true
}
```
More details about[manifest file format](/docs/development/core/server/kibana-plugin-server.pluginmanifest.md)

Note that `package.json` files are irrelevant to and ignored by the new platform.

**[2] `public/index.ts`** is the entry point into the client-side code of this plugin. It must export a function named `plugin`, which will receive a standard set of core capabilities as an argument (e.g. logger). It should return an instance of its plugin definition for the platform to register at load time.

```ts
import { PluginInitializerContext } from 'kibana/server';
import { Plugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new Plugin(initializerContext);
}
```

**[3] `public/plugin.ts`** is the client-side plugin definition itself. Technically speaking it does not need to be a class or even a separate file from the entry point, but _all plugins at Elastic_ should be consistent in this way.

```ts
import { PluginInitializerContext, CoreSetup, CoreStart } from 'kibana/server';

export class Plugin {
  constructor(initializerContext: PluginInitializerContext) {
  }

  public setup(core: CoreSetup) {
    // called when plugin is setting up
  }

  public start(core: CoreStart) {
    // called after all plugins are set up
  }

  public stop() {
    // called when plugin is torn down, aka window.onbeforeunload
  }
}
```

**[4] `server/index.ts`** is the entry-point into the server-side code of this plugin. It is identical in almost every way to the client-side entry-point:

```ts
import { PluginInitializerContext } from 'kibana/server';
import { Plugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new Plugin(initializerContext);
}
```

**[5] `server/plugin.ts`** is the server-side plugin definition. The _shape_ of this plugin is the same as it's client-side counter-part:

```ts
import { PluginInitializerContext, CoreSetup, CoreStart } from 'kibana/server';

export class Plugin {
  constructor(initializerContext: PluginInitializerContext) {
  }

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

The platform does not impose any technical restrictions on how the internals of the plugin are architected, though there are certain considerations related to how plugins interact with core and how plugins interact with other plugins that may greatly impact how they are built.

### Services

The various independent domains that make up `core` are represented by a series of services, and many of those services expose public interfaces that are provided to _all_ plugins. Services expose different features at different parts of their _lifecycle_. We describe the lifecycle of core services and plugins with specifically-named functions on the service definition.

In the new platform, there are three lifecycle functions today: `setup`, `start`, and `stop`. The `setup` functions are invoked sequentially while Kibana is setting up on the server or when it is being loaded in the browser. The `start` functions are invoked sequentially after setup has completed for all plugins. The `stop` functions are invoked sequentially while Kibana is gracefully shutting down on the server or when the browser tab or window is being closed.

The table below explains how each lifecycle event relates to the state of Kibana.

| lifecycle event | server                                    | browser                                             |
| --------------- | ----------------------------------------- | --------------------------------------------------- |
| *setup*         | bootstrapping and configuring routes      | loading plugin bundles and configuring applications |
| *start*         | server is now serving traffic             | browser is now showing UI to the user               |
| *stop*          | server has received a request to shutdown | user is navigating away from Kibana                 |

There is no equivalent behavior to `start` or `stop` in legacy plugins, so this guide primarily focuses on migrating functionality into `setup`.

The lifecycle-specific contracts exposed by core services are always passed as the first argument to the equivalent lifecycle function in a plugin. For example, the core `UiSettings` service exposes a function `get` to all plugin `setup` functions. To use this function to retrieve a specific UI setting, a plugin just accesses it off of the first argument:

```ts
import { CoreSetup } from 'kibana/server';

export class Plugin {
  public setup(core: CoreSetup) {
    core.uiSettings.get('courier:maxShardsBeforeCryTime');
  }
}
```

Different service interfaces can and will be passed to `setup` and `stop` because certain functionality makes sense in the context of a running plugin while other types of functionality may have restrictions or may only make sense in the context of a plugin that is stopping.

For example, the `stop` function in the browser gets invoked as part of the `window.onbeforeunload` event, which means you can't necessarily execute asynchronous code here in a reliable way. For that reason, `core` likely wouldn't provide any asynchronous functions to plugin `stop` functions in the browser.

Core services that expose functionality to plugins always have their `setup` function ran before any plugins.

These are the contracts exposed by the core services for each lifecycle event:

| lifecycle event | contract                                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| *contructor*    | [PluginInitializerContext](../../docs/development/core/server/kibana-plugin-server.plugininitializercontext.md) |
| *setup*         | [CoreSetup](../../docs/development/core/server/kibana-plugin-server.coresetup.md)                               |
| *start*         | [CoreStart](../../docs/development/core/server/kibana-plugin-server.corestart.md)                               |
| *stop*          |                                                                                                                 |

### Integrating with other plugins

Plugins can expose public interfaces for other plugins to consume. Like `core`, those interfaces are bound to the lifecycle functions `setup` and/or `start`.

Anything returned from `setup` or `start` will act as the interface, and while not a technical requirement, all Elastic plugins should expose types for that interface as well. 3rd party plugins wishing to allow other plugins to integrate with it are also highly encouraged to expose types for their plugin interfaces.

**foobar plugin.ts:**

```ts
export type FoobarPluginSetup = ReturnType<Plugin['setup']>;
export type FoobarPluginStart = ReturnType<Plugin['start']>;

export class Plugin {
  public setup() {
    return {
      getFoo() {
        return 'foo';
      }
    };
  }

  public start() {
    return {
      getBar() {
        return 'bar';
      }
    }
  }
}
```

Unlike core, capabilities exposed by plugins are _not_ automatically injected into all plugins. Instead, if a plugin wishes to use the public interface provided by another plugin, they must first declare that plugin as a dependency in their `kibana.json`.

**demo kibana.json:**

```json
{
  "id": "demo",
  "requiredPlugins": [
    "foobar"
  ],
  "server": true,
  "ui": true
}
```

With that specified in the plugin manifest, the appropriate interfaces are then available via the second argument of `setup` and/or `start`:

**demo plugin.ts:**

```ts
import { CoreSetup, CoreStart } from 'src/core/server';
import { FoobarPluginSetup, FoobarPluginStop } from '../../foobar/server';

interface DemoSetupPlugins {
  foobar: FoobarPluginSetup;
}

interface DemoStartPlugins {
  foobar: FoobarPluginStart;
}

export class Plugin {
  public setup(core: CoreSetup, plugins: DemoSetupPlugins) {
    const { foobar } = plugins;
    foobar.getFoo(); // 'foo'
    foobar.getBar(); // throws because getBar does not exist
  }

  public start(core: CoreStart, plugins: DemoStartPlugins) {
    const { foobar } = plugins;
    foobar.getFoo(); // throws because getFoo does not exist
    foobar.getBar(); // 'bar'
  }

  public stop() {},
}
```

### Challenges to overcome with legacy plugins

New platform plugins have identical architecture in the browser and on the server. Legacy plugins have one architecture that they use in the browser and an entirely different architecture that they use on the server.

This means that there are unique sets of challenges for migrating to the new platform depending on whether the legacy plugin code is on the server or in the browser.

#### Challenges on the server

The general shape/architecture of legacy server-side code is similar to the new platform architecture in one important way: most legacy server-side plugins define an `init` function where the bulk of their business logic begins, and they access both "core" and "plugin-provided" functionality through the arguments given to `init`. Rarely does legacy server-side code share stateful services via import statements.

While not exactly the same, legacy plugin `init` functions behave similarly today as new platform `setup` functions. `KbnServer` also exposes an `afterPluginsInit` method which behaves similarly to `start`. There is no corresponding legacy concept of `stop`, however.

Despite their similarities, server-side plugins pose a formidable challenge: legacy core and plugin functionality is retrieved from either the hapi.js `server` or `request` god objects. Worse, these objects are often passed deeply throughout entire plugins, which directly couples business logic with hapi. And the worst of it all is, these objects are mutable at any time.

The key challenge to overcome with legacy server-side plugins will decoupling from hapi.

#### Challenges in the browser

The legacy plugin system in the browser is fundamentally incompatible with the new platform. There is no client-side plugin definition. There are no services that get passed to plugins at runtime. There really isn't even a concrete notion of "core".

When a legacy browser plugin needs to access functionality from another plugin, say to register a UI section to render within another plugin, it imports a stateful (global singleton) JavaScript module and performs some sort of state mutation. Sometimes this module exists inside the plugin itself, and it gets imported via the `plugin/` webpack alias. Sometimes this module exists outside the context of plugins entirely and gets imported via the `ui/` webpack alias. Neither of these concepts exist in the new platform.

Legacy browser plugins rely on the feature known as `uiExports/`, which integrates directly with our build system to ensure that plugin code is bundled together in such a way to enable that global singleton module state. There is no corresponding feature in the new platform, and in fact we intend down the line to build new platform plugins as immutable bundles that can not share state in this way.

The key challenge to overcome with legacy browser-side plugins will be converting all imports from `plugin/`, `ui/`, `uiExports`, and relative imports from other plugins into a set of services that originate at runtime during plugin initialization and get passed around throughout the business logic of the plugin as function arguments.

### Plan of action

In order to move a legacy plugin to the new plugin system, the challenges on the server and in the browser must be addressed. Fortunately, **the hardest problems can be solved in legacy plugins today** without consuming the new plugin system at all.

The approach and level of effort varies significantly between server and browser plugins, but at a high level the approach is the same.

First, decouple your plugin's business logic from the dependencies that are not exposed through the new platform, hapi.js and angular.js. Then introduce plugin definitions that more accurately reflect how plugins are defined in the new platform. Finally, replace the functionality you consume from core and other plugins with their new platform equivalents.

Once those things are finished for any given plugin, it can officially be switched to the new plugin system.

### Shared application plugins

Some services have been already moved to the new platform.

Below you can find their new locations:

| Service | Old place                                    | New place in the NP                                             |
| --------------- | ----------------------------------------- | --------------------------------------------------- |
| *FieldFormats*         | ui/registry/field_formats      | plugins/data/public |

The `FieldFormats` service has been moved to the `data` plugin in the New Platform. If your plugin has any imports from `ui/registry/field_formats`, you'll need to update your imports as follows:

Use it in your New Platform plugin:

```ts
class MyPlugin {
  setup (core, { data }) {
    data.fieldFormats.register(myFieldFormat);
    // ...
  }
  start (core, { data }) {
    data.fieldFormats.getType(myFieldFormatId);
    // ...
  }
}
```

Or, in your legacy platform plugin, consume it through the `ui/new_platform` module:

```ts
import { npSetup, npStart } from 'ui/new_platform';

npSetup.plugins.data.fieldFormats.register(myFieldFormat);
npStart.plugins.data.fieldFormats.getType(myFieldFormatId);
// ...
```

## Server-side plan of action

Legacy server-side plugins access functionality from core and other plugins at runtime via function arguments, which is similar to how they must be architected to use the new plugin system. This greatly simplifies the plan of action for migrating server-side plugins.

Here is the high-level for migrating a server-side plugin:

- De-couple from hapi.js server and request objects
- Introduce a new plugin definition shim
- Replace legacy services in shim with new platform services
- Finally, move to the new plugin system

These steps (except for the last one) do not have to be completed strictly in order, and some can be done in parallel or as part of the same change. In general, we recommend that larger plugins approach this more methodically, doing each step in a separate change. This makes each individual change less risk and more focused. This approach may not make sense for smaller plugins. For instance, it may be simpler to switch to New Platform services when you introduce your Plugin class, rather than shimming it with the legacy service.

### De-couple from hapi.js server and request objects

Most integrations with core and other plugins occur through the hapi.js `server` and `request` objects, and neither of these things are exposed through the new platform, so tackle this problem first.

Fortunately, decoupling from these objects is relatively straightforward.

The server object is introduced to your plugin in its legacy `init` function, so in that function you will "pick" the functionality you actually use from `server` and attach it to a new interface, which you will then pass in all the places you had previously been passing `server`.

The `request` object is introduced to your plugin in every route handler, so at the root of every route handler, you will create a new interface by "picking" the request information (e.g. body, headers) and core and plugin capabilities from the `request` object that you actually use and pass that in all the places you previously were passing `request`.

Any calls to mutate either the server or request objects (e.g. `server.decorate()`) will be moved toward the root of the legacy `init` function if they aren't already there.

Let's take a look at an example legacy plugin definition that uses both `server` and `request`.

```ts
// likely imported from another file
function search(server, request) {
  const { elasticsearch } = server.plugins;
  return elasticsearch.getCluster('admin').callWithRequest(request, 'search');
}

export default (kibana) => {
  return new kibana.Plugin({
    id: 'demo_plugin',

    init(server) {
      server.route({
        path: '/api/demo_plugin/search',
        method: 'POST',
        async handler(request) {
          search(server, request); // target acquired
        }
      });

      server.expose('getDemoBar', () => {
        return `Demo ${server.plugins.foo.getBar()}`;
      });
    }
  });
}
```

This example legacy plugin uses hapi's `server` object directly inside of its `init` function, which is something we can address in a later step. What we need to address in this step is when we pass the raw `server` and `request` objects into our custom `search` function.

Our goal in this step is to make sure we're not integrating with other plugins via functions on `server.plugins.*` or on the `request` object. You should begin by finding all of the integration points where you make these calls, and put them behind a "facade" abstraction that can hide the details of where these APIs come from. This allows you to easily switch out how you access these APIs without having to change all of the code that may use them.

Instead, we identify which functionality we actually need from those objects and craft custom new interfaces for them, taking care not to leak hapi.js implementation details into their design.

```ts
import { ElasticsearchPlugin, Request } from '../elasticsearch';
export interface ServerFacade {
  plugins: {
    elasticsearch: ElasticsearchPlugin
  }
}
export interface RequestFacade extends Request {
}

// likely imported from another file
function search(server: ServerFacade, request: RequestFacade) {
  const { elasticsearch } = server.plugins;
  return elasticsearch.getCluster('admin').callWithRequest(request, 'search');
}

export default (kibana) => {
  return new kibana.Plugin({
    id: 'demo_plugin',

    init(server) {
      const serverFacade: ServerFacade = {
        plugins: {
          elasticsearch: server.plugins.elasticsearch
        }
      }

      server.route({
        path: '/api/demo_plugin/search',
        method: 'POST',
        async handler(request) {
          const requestFacade: RequestFacade = {
            headers: request.headers
          };
          search(serverFacade, requestFacade);
        }
      });

      server.expose('getDemoBar', () => {
        return `Demo ${server.plugins.foo.getBar()}`;
      });
    }
  });
}
```

This change might seem trivial, but it's important for two reasons.

First, the business logic built into `search` is now coupled to an object you created manually and have complete control over rather than hapi itself. This will allow us in a future step to replace the dependency on hapi without necessarily having to modify the business logic of the plugin.

Second, it forced you to clearly define the dependencies you have on capabilities provided by core and by other plugins. This will help in a future step when you must replace those capabilities with services provided through the new platform.

### Introduce new plugin definition shim

While most plugin logic is now decoupled from hapi, the plugin definition itself still uses hapi to expose functionality for other plugins to consume and access functionality from both core and a different plugin.

```ts
// index.ts

export default (kibana) => {
  return new kibana.Plugin({
    id: 'demo_plugin',

    init(server) {
      const serverFacade: ServerFacade = {
        plugins: {
          elasticsearch: server.plugins.elasticsearch
        }
      }

      // HTTP functionality from legacy
      server.route({
        path: '/api/demo_plugin/search',
        method: 'POST',
        async handler(request) {
          const requestFacade: RequestFacade = {
            headers: request.headers
          };
          search(serverFacade, requestFacade);
        }
      });

      // Exposing functionality for other plugins
      server.expose('getDemoBar', () => {
        return `Demo ${server.plugins.foo.getBar()}`; // Accessing functionality from another plugin
      });
    }
  });
}
```

We now move this logic into a new plugin definition, which is based off of the conventions used in real new platform plugins. While the legacy plugin definition is in the root of the plugin, this new plugin definition will be under the plugin's `server/` directory since it is only the server-side plugin definition.

```ts
// server/plugin.ts
import { CoreSetup, Plugin } from 'src/core/server';
import { ElasticsearchPlugin } from '../elasticsearch';

interface FooSetup {
  getBar(): string
}

// We inject the miminal legacy dependencies into our plugin including dependencies on other legacy
// plugins. Take care to only expose the legacy functionality you need e.g. don't inject the whole
// `Legacy.Server` if you only depend on `Legacy.Server['route']`.
interface LegacySetup {
  route: Legacy.Server['route']
  plugins: {
    elasticsearch: ElasticsearchPlugin, // note: Elasticsearch is in CoreSetup in NP, rather than a plugin
    foo: FooSetup
  }
}

// Define the public API's for our plugins setup and start lifecycle
export interface DemoSetup {
  getDemoBar: () => string;
}
export interface DemoStart {}

// Once we start dependending on NP plugins' setup or start API's we'll add their types here
export interface DemoSetupDeps {}
export interface DemoStartDeps {}

export class DemoPlugin implements Plugin<DemoSetup, DemoStart, DemoSetupDeps, DemoStartDeps> {
  public setup(core: CoreSetup, plugins: PluginsSetup, __LEGACY: LegacySetup): DemoSetup {
    // We're still using the legacy Elasticsearch and http router here, but we're now accessing
    // these services in the same way a NP plugin would: injected into the setup function. It's
    // also obvious that these dependencies needs to be removed by migrating over to the New
    // Platform services exposed through core.
    const serverFacade: ServerFacade = {
      plugins: {
        elasticsearch: __LEGACY.plugins.elasticsearch
      }
    }

    __LEGACY.route({
      path: '/api/demo_plugin/search',
      method: 'POST',
      async handler(request) {
        const requestFacade: RequestFacade = {
          headers: request.headers
        };
        search(serverFacade, requestFacade);
      }
    });

    // Exposing functionality for other plugins
    return {
      getDemoBar() {
        return `Demo ${__LEGACY.plugins.foo.getBar()}`; // Accessing functionality from another legacy plugin
      }
    };
  }
}
```

The legacy plugin definition is still the one that is being executed, so we now "shim" this new plugin definition into the legacy world by instantiating it and wiring it up inside of the legacy `init` function.

```ts
// index.ts

import { Plugin, PluginDependencies, LegacySetup } from './server/plugin';

export default (kibana) => {
  return new kibana.Plugin({
    id: 'demo_plugin',

    init(server) {
      // core setup API's
      const coreSetup = server.newPlatform.setup.core;

      // For now we don't have any dependencies on NP plugins
      const pluginsSetup: PluginsSetup = {};

      // legacy dependencies
      const __LEGACY: LegacySetup = {
        route: server.route,
        plugins: {
          elasticsearch: server.plugins.elasticsearch,
          foo: server.plugins.foo
        }
      };

      const demoSetup = new Plugin().setup(coreSetup, pluginsSetup, __LEGACY);

      // continue to expose functionality to legacy plugins
      server.expose('getDemoBar', demoSetup.getDemoBar);
    }
  });
}
```

> Note: An equally valid approach is to extend `CoreSetup` with a `__legacy`
> property instead of introducing a third parameter to your plugins lifecycle
> function. The important thing is that you reduce the legacy API surface that
> you depend on to a minimum by only picking and injecting the methods you
> require and that you clearly differentiate legacy dependencies in a namespace.

This introduces a layer between the legacy plugin system with hapi.js and the logic you want to move to the new plugin system. The functionality exposed through that layer is still provided from the legacy world and in some cases is still technically powered directly by hapi, but building this layer forced you to identify the remaining touch points into the legacy world and it provides you with control when you start migrating to new platform-backed services.

> Need help constructing your shim? There are some common APIs that are already present in the New Platform. In these cases, it may make more sense to simply use the New Platform service rather than crafting your own shim. Refer to the _[How do I build my shim for New Platform services?](#how-do-i-build-my-shim-for-new-platform-services)_ section for a table of legacy to new platform service translations to identify these. Note that while some APIs have simply _moved_ others are completely different. Take care when choosing how much refactoring to do in a single change.

### Switch to new platform services

At this point, your legacy server-side plugin is described in the shape and
conventions of the new plugin system, and all of the touch points with the
legacy world and hapi.js have been isolated inside the `__LEGACY` parameter.

Now the goal is to replace all legacy services with services provided by the new platform instead.

For the first time in this guide, your progress here is limited by the migration efforts within core and other plugins.

As core capabilities are migrated to services in the new platform, they are made available as lifecycle contracts to the legacy `init` function through `server.newPlatform`. This allows you to adopt the new platform service APIs directly in your legacy plugin as they get rolled out.

For the most part, care has been taken when migrating services to the new platform to preserve the existing APIs as much as possible, but there will be times when new APIs differ from the legacy equivalents.

If a legacy API differs from its new platform equivalent, some refactoring will be required. The best outcome comes from updating the plugin code to use the new API, but if that's not practical now, you can also create a facade inside your new plugin definition that is shaped like the legacy API but powered by the new API. Once either of these things is done, that override can be removed from the shim.

Eventually, all `__LEGACY` dependencies will be removed and your Plugin will
be powered entirely by Core API's from `server.newPlatform.setup.core`.

```ts
init(server) {
  // core setup API's
  const coreSetup = server.newPlatform.setup.core;

  // For now we don't have any dependencies on NP plugins
  const pluginsSetup: PluginsSetup = {};

  // legacy dependencies, we've removed our dependency on elasticsearch and server.route
  const __LEGACY: LegacySetup = {
    plugins: {
      foo: server.plugins.foo
    }
  };

  const demoSetup = new Plugin().setup(coreSetup, pluginsSetup, __LEGACY);
}
```

At this point, your legacy server-side plugin logic is no longer coupled to
the legacy core.

A similar approach can be taken for your plugin dependencies. To start
consuming an API from a New Platform plugin access these from
`server.newPlatform.setup.plugins` and inject it into your plugin's setup
function.

```ts
init(server) {
  // core setup API's
  const coreSetup = server.newPlatform.setup.core;

  // Depend on the NP plugin 'foo'
  const pluginsSetup: PluginsSetup = {
    foo: server.newPlatform.setup.plugins.foo
  };

  const demoSetup = new Plugin().setup(coreSetup, pluginsSetup);
}
```

As the plugins you depend on are migrated to the new platform, their contract
will be exposed through `server.newPlatform`, so the `__LEGACY` dependencies
should be removed. Like in core, plugins should take care to preserve their
existing APIs to make this step as seamless as possible.

It is much easier to reliably make breaking changes to plugin APIs in the new
platform than it is in the legacy world, so if you're planning a big change,
consider doing it after your dependent plugins have migrated rather than as
part of your own migration.

Eventually, all `__LEGACY` dependencies will be removed and your plugin will be
entirely powered by the New Platform and New Platform plugins.

> Note: All New Platform plugins are exposed to legacy plugins via
> `server.newPlatform.setup.plugins`. Once you move your plugin over to the
> New Platform you will have to explicitly declare your dependencies on other
> plugins in your `kibana.json` manifest file.

At this point, your legacy server-side plugin logic is no longer coupled to legacy plugins.

### Migrate to the new plugin system

With both shims converted, you are now ready to complete your migration to the new platform.

Many plugins will copy and paste all of their plugin code into a new plugin directory in either `src/plugins` for OSS or `x-pack/plugins` for commerical code and then delete their legacy shims. It's at this point that you'll want to make sure to create your `kibana.json` file if it does not already exist.

With the previous steps resolved, this final step should be easy, but the exact process may vary plugin by plugin, so when you're at this point talk to the platform team to figure out the exact changes you need.

Other plugins may want to move subsystems over individually. For instance, you can move routes over to the New Platform in groups rather than all at once. Other examples that could be broken up:

- Configuration schema ([see example](./MIGRATION_EXAMPLES.md#declaring-config-schema))
- HTTP route registration ([see example](./MIGRATION_EXAMPLES.md#http-routes))
- Polling mechanisms (eg. job worker)

In general, we recommend moving all at once by ensuring you're not depending on any legacy code before you move over.

## Browser-side plan of action

It is generally a much greater challenge preparing legacy browser-side code for the new platform than it is server-side, and as such there are a few more steps. The level of effort here is proportional to the extent to which a plugin is dependent on angular.js.

To complicate matters further, a significant amount of the business logic in Kibana's client-side code exists inside the `ui/public` directory (aka ui modules), and all of that must be migrated as well. Unlike the server-side code where the order in which you migrated plugins was not particularly important, it's important that UI modules be addressed as soon as possible.

Because usage of angular and `ui/public` modules varies widely between legacy plugins, there is no "one size fits all" solution to migrating your browser-side code to the new platform. The best place to start is by checking with the platform team to help identify the best migration path for your particular plugin.

That said, we've seen a series of patterns emerge as teams begin migrating browser code. In practice, most migrations will follow a path that looks something like this:

#### 1. Create a plugin definition file

We've found that doing this right away helps you start thinking about your plugin in terms of lifecycle methods and services, which makes the rest of the migration process feel more natural. It also forces you to identify which actions "kick off" your plugin, since you'll need to execute those when the `setup/start` methods are called.

This definition isn't going to do much for us just yet, but as we get further into the process, we will gradually start returning contracts from our `setup` and `start` methods, while also injecting dependencies as arguments to these methods.

```ts
// public/plugin.ts
import { CoreSetup, CoreStart, Plugin } from 'kibana/server';
import { FooSetup, FooStart } from '../../../../legacy/core_plugins/foo/public';

/**
 * These are the private interfaces for the services your plugin depends on.
 * @internal
 */
export interface DemoSetupDeps {
  foo: FooSetup;
}
export interface DemoStartDeps {
  foo: FooStart;
}

/**
 * These are the interfaces with your public contracts. You should export these
 * for other plugins to use in _their_ `SetupDeps`/`StartDeps` interfaces.
 * @public
 */
export type DemoSetup = {}
export type DemoStart = {}

/** @internal */
export class DemoPlugin implements Plugin<DemoSetup, DemoStart, DemoSetupDeps, DemoStartDeps> {
  public setup(core: CoreSetup, plugins: DemoSetupDeps): DemoSetup {
    // kick off your plugin here...
    return {
      fetchConfig: () => ({}),
    };
  }

  public start(core: CoreStart, plugins: DemoStartDeps): DemoStart {
    // ...or here
    return {
      initDemo: () => ({}),
    };
  }

  public stop() {}
}
```

#### 2. Export all static code and types from `public/index.ts`

If your plugin needs to share static code with other plugins, this code must be exported from your top-level `public/index.ts`. This includes any type interfaces that you wish to make public. For details on the types of code that you can safely share outside of the runtime lifecycle contracts, see [Can static code be shared between plugins?](#can-static-code-be-shared-between-plugins)

```ts
// public/index.ts
import { DemoSetup, DemoStart } from './plugin';

const myPureFn = (x: number): number => x + 1;
const MyReactComponent = (props) => {
  return <h1>Hello, {props.name}</h1>;
}

// These are your public types & static code
export {
  myPureFn,
  MyReactComponent,
  DemoSetup,
  DemoStart,
}
```

While you're at it, you can also add your plugin initializer to this file:

```ts
// public/index.ts
import { PluginInitializer, PluginInitializerContext } from 'kibana/server';
import { DemoSetup, DemoStart, DemoSetupDeps, DemoStartDeps, DemoPlugin } from './plugin';

// Core will be looking for this when loading our plugin in the new platform
export const plugin: PluginInitializer<DemoSetup, DemoStart, DemoSetupDeps, DemoStartDeps> = (
  initializerContext: PluginInitializerContext
) => {
  return new DemoPlugin();
};

const myPureFn = (x: number): number => x + 1;
const MyReactComponent = (props) => {
  return <h1>Hello, {props.name}</h1>;
}

/** @public */
export {
  myPureFn,
  MyReactComponent,
  DemoSetup,
  DemoStart,
}
```

Great! So you have your plugin definition, and you've moved all of your static exports to the top level of your plugin... now let's move on to the runtime contract your plugin will be exposing.

#### 3. Export your runtime contract

Next, we need a way to expose your runtime dependencies. In the new platform, core will handle this for you. But while we are still in the legacy world, other plugins will need a way to consume your plugin's contract without the help of core.

So we will take a similar approach to what was described above in the server section: actually call the `Plugin.setup()` and `Plugin.start()` methods, and export the values those return for other legacy plugins to consume. By convention, we've been placing this in a `legacy.ts` file, which also serves as our shim where we import our legacy dependencies and reshape them into what we are expecting in the new platform:

```ts
// public/legacy.ts
import { PluginInitializerContext } from 'kibana/server';
import { npSetup, npStart } from 'ui/new_platform';
import { plugin } from '.';

import { setup as fooSetup, start as fooStart } from '../../foo/public/legacy'; // assumes `foo` lives in `legacy/core_plugins`

const pluginInstance = plugin({} as PluginInitializerContext);
const __LEGACYSetup = {
  bar: {},        // shim for a core service that hasn't migrated yet
  foo: fooSetup,  // dependency on a legacy plugin
};
const __LEGACYStart = {
  bar: {},        // shim for a core service that hasn't migrated yet
  foo: fooStart,  // dependency on a legacy plugin
};

export const setup = pluginInstance.setup(npSetup.core, npSetup.plugins, __LEGACYSetup);
export const start = pluginInstance.start(npStart.core, npStart.plugins, __LEGACYStart);
```

> As you build your shims, you may be wondering where you will find some legacy services in the new platform. Skip to [the tables below](#how-do-i-build-my-shim-for-new-platform-services) for a list of some of the more common legacy services and where we currently expect them to live.

Notice how in the example above, we are importing the `setup` and `start` contracts from the legacy shim provided by `foo` plugin; we could just as easily be importing modules from `ui/public` here as well.

The point is that, over time, this becomes the one file in our plugin containing stateful imports from the legacy world. And _that_ is where things start to get interesting...

#### 4. Move "owned" UI modules into your plugin and expose them from your public contract

Everything inside of the `ui/public` directory is going to be dealt with in one of the following ways:

- Deleted because it doesn't need to be used anymore
- Moved to or replaced by something in core that isn't coupled to angular
- Moved to or replaced by an extension point in a specific plugin that "owns" that functionality
- Copied into each plugin that depends on it and becomes an implementation detail there

To rapidly define ownership and determine interdependencies, UI modules should move to the most appropriate plugins to own them. Modules that are considered "core" can remain in the ui directory as the platform team works to move them out.

Concerns around ownership or duplication of a given module should be raised and resolved with the appropriate team so that the code is either duplicated to break the interdependency or a team agrees to "own" that extension point in one of their plugins and the module moves there.

A great outcome is a module being deleted altogether because it isn't used or it was used so lightly that it was easy to refactor away.

If it is determined that your plugin is going to own any UI modules that other plugins depend on, you'll want to migrate these quickly so that there's time for downstream plugins to update their imports. This will ultimately involve moving the module code into your plugin, and exposing it via your setup/start contracts, or as static code from your `plugin/index.ts`. We have identified owners for most of the legacy UI modules; if you aren't sure where you should move something that you own, please consult with the platform team.

Depending on the module's level of complexity and the number of other places in Kibana that rely on it, there are a number of strategies you could use for this:

- **Do it all at once.** Move the code, expose it from your plugin, and update all imports across Kibana.
  - This works best for small pieces of code that aren't widely used.
- **Shim first, move later.** Expose the code from your plugin by importing it in your shim and then re-exporting it from your plugin first, then gradually update imports to pull from the new location, leaving the actual moving of the code as a final step.
  - This works best for the largest, most widely used modules that would otherwise result in huge, hard-to-review PRs.
  - It makes things easier by splitting the process into small, incremental PRs, but is probably overkill for things with a small surface area.
- **Hybrid approach.** As a middle ground, you can also move the code to your plugin immediately, and then re-export your plugin code from the original `ui/public` directory.
  - This eliminates any concerns about backwards compatibility by allowing you to update the imports across Kibana later.
  - Works best when the size of the PR is such that moving the code can be done without much refactoring.

#### 5. Provide plugin extension points decoupled from angular.js

There will be no global angular module in the new platform, which means none of the functionality provided by core will be coupled to angular. Since there is no global angular module shared by all applications, plugins providing extension points to be used by other plugins can not couple those extension points to angular either.

All teams that own a plugin are strongly encouraged to remove angular entirely, but if nothing else they must provide non-angular-based extension points for plugins.

One way to address this problem is to go through the code that is currently exposed to plugins and refactor away all of the touch points into angular.js. This might be the easiest option in some cases, but it might be hard in others.

Another way to address this problem is to create an entirely new set of plugin APIs that are not dependent on angular.js, and then update the implementation within the plugin to "merge" the angular and non-angular capabilities together. This is a good approach if preserving the existing angular API until we remove the old plugin system entirely is of critical importance. Generally speaking though, the removal of angular and introduction of a new set of public plugin APIs is a good reason to make a breaking change to the existing plugin capabilities. Make sure the PRs are tagged appropriately so we add these changes to our plugin changes blog post for each release.

Please talk with the platform team when formalizing _any_ client-side extension points that you intend to move to the new platform as there are some bundling considerations to consider.

#### 6. Move all webpack alias imports into uiExport entry files

Existing plugins import three things using webpack aliases today: services from ui/public (`ui/`), services from other plugins (`plugins/`), and uiExports themselves (`uiExports/`). These webpack aliases will not exist once we remove the legacy plugin system, so part of our migration effort is addressing all of the places where they are used today.

In the new platform, dependencies from core and other plugins will be passed through lifecycle functions in the plugin definition itself. In a sense, they will be run from the "root" of the plugin.

With the legacy plugin system, extensions of core and other plugins are handled through entry files defined as uiExport paths. In other words, when a plugin wants to serve an application (a core-owned thing), it defines a main entry file for the app via the `app` uiExport, and when a plugin wants to extend visTypes (a plugin-owned thing), they do so by specifying an entry file path for the `visType` uiExport.

Each uiExport path is an entry file into one specific set of functionality provided by a client-side plugin. All webpack alias-based imports should be moved to these entry files, where they are appropriate. Moving a deeply nested webpack alias-based import in a plugin to one of the uiExport entry files might require some refactoring to ensure the dependency is now passed down to the appropriate place as function arguments instead of via import statements.

For stateful dependencies using the `plugins/` and `ui/` webpack aliases, you should be able to take advantage of the `legacy.ts` shim you created earlier. By placing these imports directly in your shim, you can pass the dependencies you need into your `Plugin.start` and `Plugin.setup` methods, from which point they can be passed down to the rest of your plugin's entry files.

For items that don't yet have a clear "home" in the new platform, it may also be helpful to somehow indicate this in your shim to make it easier to remember that you'll need to change this later. One convention we've found helpful for this is simply using a namespace like `__LEGACY`:

```ts
// public/legacy.ts
import { uiThing } from 'ui/thing';
...

const pluginInstance = plugin({} as PluginInitializerContext);
const __LEGACY = {
  foo: fooSetup,
  uiThing, // eventually this will move out of __LEGACY and into a NP plugin
};

...
export const setup = pluginInstance.setup(npSetup.core, npSetup.plugins, __LEGACY);
```

#### 7. Switch to new platform services

At this point, your plugin has one or more uiExport entry files that together contain all of the webpack alias-based import statements needed to run your plugin. Each one of these import statements is either a service that is or will be provided by core or a service provided by another plugin.

As new non-angular-based APIs are added, update your entry files to import the correct service API. The service APIs provided directly from the new platform can be imported through the `ui/new_platform` module for the duration of this migration. As new services are added, they will also be exposed there. This includes all core services as well as any APIs provided by real new platform plugins.

Once all of the existing webpack alias-based imports in your plugin switch to `ui/new_platform`, it no longer depends directly on the legacy "core" features or other legacy plugins, so it is ready to officially migrate to the new platform.

#### 8. Migrate to the new plugin system

With all of your services converted, you are now ready to complete your migration to the new platform.

Many plugins at this point will copy over their plugin definition class & the code from their various service/uiExport entry files directly into the new plugin directory. The `legacy.ts` shim file can then simply be deleted.

With the previous steps resolved, this final step should be easy, but the exact process may vary plugin by plugin, so when you're at this point talk to the platform team to figure out the exact changes you need.

Other plugins may want to move subsystems over individually. Examples of pieces that could be broken up:

- Registration logic (eg. viz types, embeddables, chrome nav controls)
- Application mounting
- Polling mechanisms (eg. job worker)

#### Bonus: Tips for complex migration scenarios

For a few plugins, some of these steps (such as angular removal) could be a months-long process. In those cases, it may be helpful from an organizational perspective to maintain a clear separation of code that is and isn't "ready" for the new platform.

One convention that is useful for this is creating a dedicated `public/np_ready` directory to house the code that is ready to migrate, and gradually move more and more code into it until the rest of your plugin is essentially empty. At that point, you'll be able to copy your `index.ts`, `plugin.ts`, and the contents of `./np_ready` over into your plugin in the new platform, leaving your legacy shim behind. This carries the added benefit of providing a way for us to introduce helpful tooling in the future, such as [custom eslint rules](https://github.com/elastic/kibana/pull/40537), which could be run against that specific directory to ensure your code is ready to migrate.

## Frequently asked questions

### Is migrating a plugin an all-or-nothing thing?

It doesn't have to be. Within the Kibana repo, you can have a new platform plugin with the same name as a legacy plugin.

Technically speaking, you could move all of your server-side code to the new platform and leave the legacy browser-side code where it is. You can even move only a portion of code on your server at a time, like on a route by route basis for example.

For any new plugin APIs being defined as part of this process, it is recommended to create those APIs in new platform plugins, and then core will pass them down into the legacy world to be used there. This leaves one less thing you need to migrate.

### Do plugins need to be converted to TypeScript?

No. That said, the migration process will require a lot of refactoring, and TypeScript will make this dramatically easier and less risky. Independent of the new platform effort, our goals are to convert the entire Kibana repo to TypeScript over time, so now is a great time to do it.

At the very least, any plugin exposing an extension point should do so with first-class type support so downstream plugins that _are_ using TypeScript can depend on those types.

### Can static code be shared between plugins?

**tl;dr** Yes, but it should be limited to pure functional code that does not depend on outside state from the platform or a plugin.

#### Background

> Don't care why, just want to know how? Skip to the ["how" section below](#how-to-decide-what-code-can-be-statically-imported).

Legacy Kibana has never run as a single page application. Each plugin has it's own entry point and gets "ownership" of every module it imports when it is loaded into the browser. This has allowed stateful modules to work without breaking other plugins because each time the user navigates to a new plugin, the browser reloads with a different entry bundle, clearing the state of the previous plugin.

Because of this "feature" many undesirable things developed in the legacy platform:

- We had to invent an unconventional and fragile way of allowing plugins to integrate and communicate with one another, `uiExports`.
- It has never mattered if shared modules in `ui/public` were stateful or cleaned up after themselves, so many of them behave like global singletons. These modules could never work in single-page application because of this state.
- We've had to ship Webpack with Kibana in production so plugins could be disabled or installed and still have access to all the "platform" features of `ui/public` modules and all the `uiExports` would be present for any enabled plugins.
- We've had to require that 3rd-party plugin developers release a new version of their plugin for each and every version of Kibana because these shared modules have no stable API and are coupled tightly both to their consumers and the Kibana platform.

The New Platform's primary goal is to make developing Kibana plugins easier, both for developers at Elastic and in the community. The approach we've chosen is to enable plugins to integrate and communicate _at runtime_ rather than at build time. By wiring services and plugins up at runtime, we can ship stable APIs that do not have to be compiled into every plugin and instead live inside a solid core that each plugin gets connected to when it executes.

This applies to APIs that plugins expose as well. In the new platform, plugins can communicate through an explicit interface rather than importing all the code from one another and having to recompile Webpack bundles when a plugin is disabled or a new plugin is installed.

You've probably noticed that this is not the typical way a JavaScript developer works. We're used to importing code at the top of files (and for some use-cases this is still fine). However, we're not building a typical JavaScript application, we're building an application that is installed into a dynamic system (the Kibana Platform).

#### What goes wrong if I do share modules with state?

One goal of a stable Kibana core API is to allow Kibana instances to run plugins with varying minor versions, e.g. Kibana 8.4.0 running PluginX 8.0.1 and PluginY 8.2.5. This will be made possible by building each plugin into an “immutable bundle” that can be installed into Kibana. You can think of an immutable bundle as code that doesn't share any imported dependencies with any other bundles, that is all it's dependencies are bundled together.

This method of building and installing plugins comes with side effects which are important to be aware of when developing a plugin.

- **Any code you export to other plugins will get copied into their bundles.** If a plugin is built for 8.1 and is running on Kibana 8.2, any modules it imported that changed will not be updated in that plugin.
- **When a plugin is disabled, other plugins can still import its static exports.** This can make code difficult to reason about and result in poor user experience. For example, users generally expect that all of a plugin’s features will be disabled when the plugin is disabled. If another plugin imports a disabled plugin’s feature and exposes it to the user, then users will be confused about whether that plugin really is disabled or not.
- **Plugins cannot share state by importing each others modules.** Sharing state via imports does not work because exported modules will be copied into plugins that import them. Let’s say your plugin exports a module that’s imported by other plugins. If your plugin populates state into this module, a natural expectation would be that the other plugins now have access to this state. However, because those plugins have copies of the exported module, this assumption will be incorrect.

#### How to decide what code can be statically imported

The general rule of thumb here is: any module that is not purely functional should not be shared statically, and instead should be exposed at runtime via the plugin's `setup` and/or `start` contracts.

Ask yourself these questions when deciding to share code through static exports or plugin contracts:

- Is its behavior dependent on any state populated from my plugin?
- If a plugin uses an old copy (from an older version of Kibana) of this module, will it still break?

If you answered yes to any of the above questions, you probably have an impure module that cannot be shared across plugins. Another way to think about this: if someone literally copied and pasted your exported module into their plugin, would it break if:

- Your original module changed in a future version and the copy was the old version; or
- If your plugin doesn’t have access to the copied version in the other plugin (because it doesn't know about it).

If your module were to break for either of these reasons, it should not be exported statically. This can be more easily illustrated by examples of what can and cannot be exported statically.

Examples of code that could be shared statically:

- Constants. Strings and numbers that do not ever change (even between Kibana versions)
  - If constants do change between Kibana versions, then they should only be exported statically if the old value would not _break_ if it is still used. For instance, exporting a constant like `VALID_INDEX_NAME_CHARACTERS` would be fine, but exporting a constant like `API_BASE_PATH` would not because if this changed, old bundles using the previous value would break.
- React components that do not depend on module state.
  - Make sure these components are not dependent on or pre-wired to Core services. In many of these cases you can export a HOC that takes the Core service and returns a component wired up to that particular service instance.
  - These components do not need to be "pure" in the sense that they do not use React state or React hooks, they just cannot rely on state inside the module or any modules it imports.
- Pure computation functions, for example lodash-like functions like `mapValues`.

Examples of code that could **not** be shared statically and how to fix it:

- A function that calls a Core service, but does not take that service as a parameter.
  - If the function does not take a client as an argument, it must have an instance of the client in its internal state, populated by your plugin. This would not work across plugin boundaries because your plugin would not be able to call `setClient` in the copy of this module in other plugins:

    ```js
    let esClient;
    export const setClient = (client) => esClient = client;
    export const query = (params) => esClient.search(params);
    ```

  - This could be fixed by requiring the calling code to provide the client:

    ```js
    export const query = (esClient, params) => esClient.search(params);
    ```

- A function that allows other plugins to register values that get pushed into an array defined internally to the module.
  - The values registered would only be visible to the plugin that imported it. Each plugin would essentially have their own registry of visTypes that is not visible to any other plugins.

    ```js
    const visTypes = [];
    export const registerVisType = (visType) => visTypes.push(visType);
    export const getVisTypes = () => visTypes;
    ```

  - For state that does need to be shared across plugins, you will need to expose methods in your plugin's `setup` and `start` contracts.

    ```js
    class MyPlugin {
      constructor() { this.visTypes = [] }
      setup() {
        return {
          registerVisType: (visType) => this.visTypes.push(visType)
        }
      }

      start() {
        return {
          getVisTypes: () => this.visTypes
        }
      }
    }
    ```

In any case, you will also need to carefully consider backward compatibility (BWC). Whatever you choose to export will need to work for the entire major version cycle (eg. Kibana 8.0-8.9), regardless of which version of the export a plugin has bundled and which minor version of Kibana they're using. Breaking changes to static exports are only allowed in major versions. However, during the 7.x cycle, all of these APIs are considered "experimental" and can be broken at any time. We will not consider these APIs stable until 8.0 at the earliest.

#### Concrete Example

Ok, you've decided you want to export static code from your plugin, how do you do it? The New Platform only considers values exported from `my_plugin/public` and `my_plugin/server` to be stable. The linter will only let you import statically from these top-level modules. In the future, our tooling will enforce that these APIs do not break between minor versions. All code shared among plugins should be exported in these modules like so:

```ts
// my_plugin/public/index.ts
export { MyPureComponent } from './components';

// regular plugin export used by core to initialize your plugin
export const plugin = ...;
```

These can then be imported using relative paths from other plugins:

```ts
// my_other_plugin/public/components/my_app.ts
import { MyPureComponent } from '../my_plugin/public';
```

If you have code that should be available to other plugins on both the client and server, you can have a common directory. _See [How is "common" code shared on both the client and server?](#how-is-common-code-shared-on-both-the-client-and-server)_

### How can I avoid passing Core services deeply within my UI component tree?

There are some Core services that are purely presentational, for example `core.overlays.openModal()` or `core.application.createLink()` where UI code does need access to these deeply within your application. However, passing these services down as props throughout your application leads to lots of boilerplate. To avoid this, you have three options:

1. Use an abstraction layer, like Redux, to decouple your UI code from core (**this is the highly preferred option**); or
    - [redux-thunk](https://github.com/reduxjs/redux-thunk#injecting-a-custom-argument) and [redux-saga](https://redux-saga.js.org/docs/api/#createsagamiddlewareoptions) already have ways to do this.
2. Use React Context to provide these services to large parts of your React tree; or
3. Create a high-order-component that injects core into a React component; or
    - This would be a stateful module that holds a reference to Core, but provides it as props to components with a `withCore(MyComponent)` interface. This can make testing components simpler. (Note: this module cannot be shared across plugin boundaries, see above).
4. Create a global singleton module that gets imported into each module that needs it. (Note: this module cannot be shared across plugin boundaries, see above). [Example](https://gist.github.com/epixa/06c8eeabd99da3c7545ab295e49acdc3).

If you find that you need many different Core services throughout your application, this may be a code smell and could lead to pain down the road. For instance, if you need access to an HTTP Client or SavedObjectsClient in many places in your React tree, it's likely that a data layer abstraction (like Redux) could make developing your plugin much simpler (see option 1).

Without such an abstraction, you will need to mock out Core services throughout your test suite and will couple your UI code very tightly to Core. However, if you can contain all of your integration points with Core to Redux middleware and/or reducers, you only need to mock Core services once, and benefit from being able to change those integrations with Core in one place rather than many. This will become incredibly handy when Core APIs have breaking changes.

### How is "common" code shared on both the client and server?

There is no formal notion of "common" code that can safely be imported from either client-side or server-side code. However, if a plugin author wishes to maintain a set of code in their plugin in a single place and then expose it to both server-side and client-side code, they can do so by exporting in the index files for both the `server` and `public` directories.

Plugins should not ever import code from deeply inside another plugin (eg. `my_plugin/public/components`) or from other top-level directories (eg. `my_plugin/common/constants`) as these are not checked for breaking changes and are considered unstable and subject to change at any time. You can have other top-level directories like `my_plugin/common`, but our tooling will not treat these as a stable API and linter rules will prevent importing from these directories _from outside the plugin_.

The benefit of this approach is that the details of where code lives and whether it is accessible in multiple runtimes is an implementation detail of the plugin itself. A plugin consumer that is writing client-side code only ever needs to concern themselves with the client-side contracts being exposed, and the same can be said for server-side contracts on the server.

A plugin author that decides some set of code should diverge from having a single "common" definition can now safely change the implementation details without impacting downstream consumers.

### When does code go into a plugin, core, or packages?

This is an impossible question to answer definitively for all circumstances. For each time this question is raised, we must carefully consider to what extent we think that code is relevant to almost everyone developing in Kibana, what license the code is shipping under, which teams are most appropriate to "own" that code, is the code stateless etc.

As a general rule of thumb, most code in Kibana should exist in plugins. Plugins are the most obvious way that we break Kibana down into sets of specialized domains with controls around interdependency communication and management. It's always possible to move code from a plugin into core if we ever decide to do so, but it's much more disruptive to move code from core to a plugin.

There is essentially no code that _can't_ exist in a plugin. When in doubt, put the code in a plugin.

After plugins, core is where most of the rest of the code in Kibana will exist. Functionality that's critical to the reliable execution of the Kibana process belongs in core. Services that will widely be used by nearly every non-trivial plugin in any Kibana install belong in core. Functionality that is too specialized to specific use cases should not be in core, so while something like generic saved objects is a core concern, index patterns are not.

The packages directory should have the least amount of code in Kibana. Just because some piece of code is not stateful doesn't mean it should go into packages. The packages directory exists to aid us in our quest to centralize as many of our owned dependencies in this single monorepo, so it's the logical place to put things like Kibana specific forks of node modules or vendor dependencies.

### How do I build my shim for New Platform services?

Many of the utilities you're using to build your plugins are available in the New Platform or in New Platform plugins. To help you build the shim for these new services, use the tables below to find where the New Platform equivalent lives.

#### Client-side

TODO: add links to API docs on items in "New Platform" column.

##### Core services

In client code, `core` can be imported in legacy plugins via the `ui/new_platform` module.

```ts
import { npStart: { core } } from 'ui/new_platform';
```

| Legacy Platform                                       | New Platform                                                                                                                                                                               | Notes                                                                                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `chrome.addBasePath`                                  | [`core.http.basePath.prepend`](/docs/development/core/public/kibana-plugin-public.httpservicebase.basepath.md)                                                                             |                                                                                                                                                |
| `chrome.breadcrumbs.set`                              | [`core.chrome.setBreadcrumbs`](/docs/development/core/public/kibana-plugin-public.chromestart.setbreadcrumbs.md)                                                                           |                                                                                                                                                |
| `chrome.getUiSettingsClient`                          | [`core.uiSettings`](/docs/development/core/public/kibana-plugin-public.uisettingsclient.md)                                                                                                |                                                                                                                                                |
| `chrome.helpExtension.set`                            | [`core.chrome.setHelpExtension`](/docs/development/core/public/kibana-plugin-public.chromestart.sethelpextension.md)                                                                       |                                                                                                                                                |
| `chrome.setVisible`                                   | [`core.chrome.setIsVisible`](/docs/development/core/public/kibana-plugin-public.chromestart.setisvisible.md)                                                                               |                                                                                                                                                |
| `chrome.setRootTemplate` / `chrome.setRootController` | --                                                                                                                                                                                         | Use application mounting via `core.application.register` (not available to legacy plugins at this time).                                       |
| `import { recentlyAccessed } from 'ui/persisted_log'` | [`core.chrome.recentlyAccessed`](/docs/development/core/public/kibana-plugin-public.chromerecentlyaccessed.md)                                                                             |                                                                                                                                                |
| `ui/capabilities`                                     | [`core.application.capabilities`](/docs/development/core/public/kibana-plugin-public.capabilities.md)                                                                                      |                                                                                                                                                |
| `ui/documentation_links`                              | [`core.docLinks`](/docs/development/core/public/kibana-plugin-public.doclinksstart.md)                                                                                                     |                                                                                                                                                |
| `ui/kfetch`                                           | [`core.http`](/docs/development/core/public/kibana-plugin-public.httpservicebase.md)                                                                                                       | API is nearly identical                                                                                                                        |
| `ui/notify`                                           | [`core.notifications`](/docs/development/core/public/kibana-plugin-public.notificationsstart.md) and [`core.overlays`](/docs/development/core/public/kibana-plugin-public.overlaystart.md) | Toast messages are in `notifications`, banners are in `overlays`. May be combined later.                                                       |
| `ui/routes`                                           | --                                                                                                                                                                                         | There is no global routing mechanism. Each app [configures its own routing](/rfcs/text/0004_application_service_mounting.md#complete-example). |
| `ui/saved_objects`                                    | [`core.savedObjects`](/docs/development/core/public/kibana-plugin-public.savedobjectsstart.md)                                                                                             | Client API is the same                                                                                                                         |
| `ui/doc_title`                                        | [`core.chrome.docTitle`](/docs/development/core/public/kibana-plugin-public.chromedoctitle.md)                                                                                             |                                                                                                                                                |
| `uiExports/injectedVars` / `chrome.getInjected`       | [Configure plugin](#configure-plugin) and [`PluginConfigDescriptor.exposeToBrowser`](/docs/development/core/server/kibana-plugin-server.pluginconfigdescriptor.exposetobrowser.md)         | Can only be used to expose configuration properties                                                                                            |

_See also: [Public's CoreStart API Docs](/docs/development/core/public/kibana-plugin-public.corestart.md)_

##### Plugins for shared application services

In client code, we have a series of plugins which house shared application services that are being built in the shape of the new platform, but for the time being, are only available in legacy. So if your plugin depends on any of the APIs below, you'll need build your plugin as a legacy plugin that shims the new platform. Once these API's have been moved to the new platform you can migrate your plugin and declare a dependency on the plugin that owns the API's you require.

The contracts for these plugins are exposed for you to consume in your own plugin; we have created dedicated exports for the `setup` and `start` contracts in a file called `legacy`. By passing these contracts to your plugin's `setup` and `start` methods, you can mimic the functionality that will eventually be provided in the new platform.

```ts
import { setup, start } from '../core_plugins/data/public/legacy';
import { setup, start } from '../core_plugins/embeddables/public/legacy';
import { setup, start } from '../core_plugins/visualizations/public/legacy';
```

| Legacy Platform                                   | New Platform                                                 | Notes                                                                                                                                                        |
| ------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `import 'ui/apply_filters'`                       | N/A. Replaced by triggering an APPLY_FILTER_TRIGGER trigger.       | Directive is deprecated.                                                                                 |
| `import 'ui/filter_bar'`                          | `import { FilterBar } from '../data/public'`                 | Directive is deprecated.                                                                                   |
| `import 'ui/query_bar'`                           | `import { QueryStringInput } from '../data/public'`          | Directives are deprecated.                                                                                                                                             |
| `import 'ui/search_bar'`                          | `import { SearchBar } from '../data/public'`                 | Directive is deprecated.                                                                                                                                     |
| `import 'ui/kbn_top_nav'`                         | `import { TopNavMenu } from '../navigation/public'`          | Directive is still available in `ui/kbn_top_nav`.                                                                                                            |
| `ui/saved_objects/components/saved_object_finder` | `import { SavedObjectFinder } from '../kibana_react/public'` |                                                                                                                                                              |
| `core_plugins/interpreter`                        | `data.expressions`                                           | still in progress                                                                                                                                            |
| `ui/courier`                                      | `data.search`                                                | still in progress                                                                                                                                            |
| `ui/embeddable`                                   | `embeddables`                                                | still in progress                                                                                                                                            |
| `ui/filter_manager`                               | `data.filter`                                                | --                                                                                                                                                           |
| `ui/index_patterns`                               | `data.indexPatterns`                                         | still in progress                                                                                                                                            |
| `ui/registry/feature_catalogue`                   | `home.featureCatalogue.register`                             | Must add `home` as a dependency in your kibana.json.                                                                                            |
| `ui/registry/vis_types`                           | `visualizations.types`                                       | --                                                                                                                                                           |
| `ui/vis`                                          | `visualizations.types`                                       | --                                                                                                                                                           |
| `ui/share`                                        | `share`                                                      | `showShareContextMenu` is now called `toggleShareContextMenu`, `ShareContextMenuExtensionsRegistryProvider` is now called `register`                         |
| `ui/vis/vis_factory`                              | `visualizations.types`                                       | --                                                                                                                                                           |
| `ui/vis/vis_filters`                              | `visualizations.filters`                                     | --                                                                                                                                                           |
| `ui/utils/parse_es_interval`                      | `import { parseEsInterval } from '../data/public'`           | `parseEsInterval`, `ParsedInterval`, `InvalidEsCalendarIntervalError`, `InvalidEsIntervalFormatError` items were moved to the `Data Plugin` as a static code |

#### Server-side

##### Core services

In server code, `core` can be accessed from either `server.newPlatform` or `kbnServer.newPlatform`. There are not currently very many services available on the server-side:

| Legacy Platform                                    | New Platform                                                                                                                      | Notes                                                                       |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `server.config()`                                  | [`initializerContext.config.create()`](/docs/development/core/server/kibana-plugin-server.plugininitializercontext.config.md)     | Must also define schema. See _[how to configure plugin](#configure-plugin)_ |
| `server.route`                                     | [`core.http.createRouter`](/docs/development/core/server/kibana-plugin-server.httpservicesetup.createrouter.md)                   | [Examples](./MIGRATION_EXAMPLES.md#route-registration)                      |
| `request.getBasePath()`                            | [`core.http.basePath.get`](/docs/development/core/server/kibana-plugin-server.httpservicesetup.basepath.md)                       |                                                                             |
| `server.plugins.elasticsearch.getCluster('data')`  | [`core.elasticsearch.dataClient$`](/docs/development/core/server/kibana-plugin-server.elasticsearchservicesetup.dataclient_.md)   | Handlers will also include a pre-configured client                          |
| `server.plugins.elasticsearch.getCluster('admin')` | [`core.elasticsearch.adminClient$`](/docs/development/core/server/kibana-plugin-server.elasticsearchservicesetup.adminclient_.md) | Handlers will also include a pre-configured client                          |
| `xpackMainPlugin.info.feature(pluginID).registerLicenseCheckResultsGenerator` | [`x-pack licensing plugin`](/x-pack/plugins/licensing/README.md) | |

_See also: [Server's CoreSetup API Docs](/docs/development/core/server/kibana-plugin-server.coresetup.md)_

#### UI Exports

The legacy platform uses a set of "uiExports" to inject modules from one plugin into other plugins. This mechansim is not necessary in the New Platform because all plugins are executed on the page at once (though only one application) is rendered at a time.

This table shows where these uiExports have moved to in the New Platform. In most cases, if a uiExport you need is not yet available in the New Platform, you may leave in your legacy plugin for the time being and continue to migrate the rest of your app to the New Platform.

| Legacy Platform              | New Platform                                                                                                              | Notes                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `aliases`                    |                                                                                                                           |                                                                                                                                       |
| `app`                        | [`core.application.register`](/docs/development/core/public/kibana-plugin-public.applicationsetup.register.md)            |                                                                                                                                       |
| `canvas`                     |                                                                                                                           | Should be an API on the canvas plugin.                                                                                                |
| `chromeNavControls`          | [`core.chrome.navControls.register{Left,Right}`](/docs/development/core/public/kibana-plugin-public.chromenavcontrols.md) |                                                                                                                                       |
| `contextMenuActions`         |                                                                                                                           | Should be an API on the devTools plugin.                                                                                              |
| `devTools`                   |                                                                                                                           |                                                                                                                                       |
| `docViews`                   |                                                                                                                           |                                                                                                                                       |
| `embeddableActions`          |                                                                                                                           | Should be an API on the embeddables plugin.                                                                                           |
| `embeddableFactories`        |                                                                                                                           | Should be an API on the embeddables plugin.                                                                                           |
| `fieldFormatEditors`         |                                                                                                                           |                                                                                                                                       |
| `fieldFormats`               |                                                                                                                           |                                                                                                                                       |
| `hacks`                      | n/a                                                                                                                       | Just run the code in your plugin's `start` method.                                                                                    |
| `home`                       | [`plugins.home.featureCatalogue.register`](./src/plugins/home/public/feature_catalogue)                                                    | Must add `home` as a dependency in your kibana.json.                                                                     |
| `indexManagement`            |                                                                                                                           | Should be an API on the indexManagement plugin.                                                                                       |
| `injectDefaultVars`          | n/a                                                                                                                       | Plugins will only be able to "whitelist" config values for the frontend. See [#41990](https://github.com/elastic/kibana/issues/41990) |
| `inspectorViews`             |                                                                                                                           | Should be an API on the data (?) plugin.                                                                                              |
| `interpreter`                |                                                                                                                           | Should be an API on the interpreter plugin.                                                                                           |
| `links`                      | n/a                                                                                                                       | Not necessary, just register your app via `core.application.register`                                                                 |
| `managementSections`         | [`plugins.management.sections.register`](/rfcs/text/0006_management_section_service.md)                                   | API finalized, implementation in progress.                                                                                            |
| `mappings`                   |                                                                                                                           | Part of SavedObjects, see [#33587](https://github.com/elastic/kibana/issues/33587)                                                    |
| `migrations`                 |                                                                                                                           | Part of SavedObjects, see [#33587](https://github.com/elastic/kibana/issues/33587)                                                    |
| `navbarExtensions`           | n/a                                                                                                                       | Deprecated                                                                                                                            |
| `savedObjectSchemas`         |                                                                                                                           | Part of SavedObjects, see [#33587](https://github.com/elastic/kibana/issues/33587)                                                    |
| `savedObjectsManagement`     |                                                                                                                           | Part of SavedObjects, see [#33587](https://github.com/elastic/kibana/issues/33587)                                                    |
| `savedObjectTypes`           |                                                                                                                           | Part of SavedObjects, see [#33587](https://github.com/elastic/kibana/issues/33587)                                                    |
| `search`                     |                                                                                                                           |                                                                                                                                       |
| `shareContextMenuExtensions` |                                                                                                                           |                                                                                                                                       |
| `styleSheetPaths`            |                                                                                                                           |                                                                                                                                       |
| `taskDefinitions`            |                                                                                                                           | Should be an API on the taskManager plugin.                                                                                           |
| `uiCapabilities`             | [`core.application.register`](/docs/development/core/public/kibana-plugin-public.applicationsetup.register.md)            |                                                                                                                                       |
| `uiSettingDefaults`          | [`core.uiSettings.register`](/docs/development/core/server/kibana-plugin-server.uisettingsservicesetup.md) |                                                                    |
| `validations`                |                                                                                                                           | Part of SavedObjects, see [#33587](https://github.com/elastic/kibana/issues/33587)                                                    |
| `visEditorTypes`             |                                                                                                                           |                                                                                                                                       |
| `visTypeEnhancers`           |                                                                                                                           |                                                                                                                                       |
| `visTypes`                   |                                                                                                                           |                                                                                                                                       |
| `visualize`                  |                                                                                                                           |                                                                                                                                       |

Examples:

- **uiSettingDefaults**

Before:

```js
uiExports: {
  uiSettingDefaults: {
    'my-plugin:my-setting': {
      name: 'just-work',
      value: true,
      description: 'make it work',
      category: ['my-category'],
    },
  }
}
```

After:

```ts
// src/plugins/my-plugin/server/plugin.ts
setup(core: CoreSetup){
  core.uiSettings.register({
    'my-plugin:my-setting': {
      name: 'just-work',
      value: true,
      description: 'make it work',
      category: ['my-category'],
    },
  })
}
```

## How to

### Configure plugin

Kibana provides ConfigService if a plugin developer may want to support adjustable runtime behavior for their plugins. Access to Kibana config in New platform has been subject to significant refactoring.

Config service does not provide access to the whole config anymore. New platform plugin cannot read configuration parameters of the core services nor other plugins directly. Use plugin contract to provide data.

```js
// your-plugin.js
// in Legacy platform
const basePath = config.get('server.basePath');
// in New platform
const basePath = core.http.basePath.get(request);
```

In order to have access to your plugin config, you *should*:

- Declare plugin specific "configPath" (will fallback to plugin "id" if not specified) in `kibana.json` file.
- Export schema validation for config from plugin's main file. Schema is mandatory. If a plugin reads from the config without schema declaration, ConfigService will throw an error.

```typescript
// my_plugin/server/index.ts
import { schema, TypeOf } from '@kbn/config-schema';
export const plugin = ...
export const config = {
  schema: schema.object(...),
};
export type MyPluginConfigType = TypeOf<typeof config.schema>;
```

- Read config value exposed via initializerContext. No config path is required.

```typescript
class MyPlugin {
  constructor(initializerContext: PluginInitializerContext) {
    this.config$ = initializerContext.config.create<MyPluginConfigType>();
    // or if config is optional:
    this.config$ = initializerContext.config.createIfExists<MyPluginConfigType>();
  }
```

If your plugin also have a client-side part, you can also expose configuration properties to it using a whitelisting mechanism with the configuration `exposeToBrowser` property.

```typescript
// my_plugin/server/index.ts
import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from 'kibana/server';

const configSchema = schema.object({
  secret: schema.string({ defaultValue: 'Only on server' }),
  uiProp: schema.string({ defaultValue: 'Accessible from client' }),
});

type ConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ConfigType> = {
  exposeToBrowser: {
    uiProp: true,
  },
  schema: configSchema,
};
```

Configuration containing only the exposed properties will be then available on the client-side using the plugin's `initializerContext`:

```typescript
// my_plugin/public/index.ts
interface ClientConfigType {
  uiProp: string;
}

export class Plugin implements Plugin<PluginSetup, PluginStart> {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public async setup(core: CoreSetup, deps: {}) {
    const config = this.initializerContext.config.get<ClientConfigType>();
    // ...
  }
```

All plugins are considered enabled by default. If you want to disable your plugin by default, you could declare the `enabled` flag in plugin config. This is a special Kibana platform key. The platform reads its value and won't create a plugin instance if `enabled: false`.
```js
export const config = {
  schema: schema.object({ enabled: schema.boolean({ defaultValue: false }) }),
};
```

### Mock new platform services in tests

#### Writing mocks for your plugin

Core services already provide mocks to simplify testing and make sure plugins always rely on valid public contracts:

```typescript
// my_plugin/server/plugin.test.ts
import { configServiceMock } from 'src/core/server/mocks';

const configService = configServiceMock.create();
configService.atPath.mockReturnValue(config$);
…
const plugin = new MyPlugin({ configService }, …);
```

Or if you need to get the whole core `setup` or `start` contracts:

```typescript
// my_plugin/public/plugin.test.ts
import { coreMock } from 'src/core/public/mocks';

const coreSetup = coreMock.createSetup();
coreSetup.uiSettings.get.mockImplementation((key: string) => {
  …
});
…
const plugin = new MyPlugin(coreSetup, ...);
```

Although it isn't mandatory, we strongly recommended you export your plugin mocks as well, in order for dependent plugins to use them in tests. Your plugin mocks should be exported from the root `/server` and `/public` directories in your plugin:

```typescript
// my_plugin/server/mocks.ts or my_plugin/public/mocks.ts
const createSetupContractMock = () => {
  const startContract: jest.Mocked<MyPluginStartContract>= {
    isValid: jest.fn();
  }
  // here we already type check as TS infers to the correct type declared above
  startContract.isValid.mockReturnValue(true);
  return startContract;
}

export const myPluginMocks = {
  createSetup: createSetupContractMock,
  createStart: …
}
```

Plugin mocks should consist of mocks for *public APIs only*: setup/start/stop contracts. Mocks aren't necessary for pure functions as other plugins can call the original implementation in tests.

#### Using mocks in your tests

During the migration process, it is likely you are preparing your plugin by shimming in new platform-ready dependencies via the legacy `ui/new_platform` module:

```typescript
import { npSetup, npStart } from 'ui/new_platform';
```

If you are using this approach, the easiest way to mock core and new platform-ready plugins in your legacy tests is to mock the `ui/new_platform` module:

```typescript
jest.mock('ui/new_platform');
```

This will automatically mock the services in `ui/new_platform` thanks to the [helpers that have been added](../../src/legacy/ui/public/new_platform/__mocks__/helpers.ts) to that module.

If others are consuming your plugin's new platform contracts via the `ui/new_platform` module, you'll want to update the helpers as well to ensure your contracts are properly mocked.

> Note: The `ui/new_platform` mock is only designed for use by old Jest tests. If you are writing new tests, you should structure your code and tests such that you don't need this mock. Instead, you should import the `core` mock directly and instantiate it.

#### What about karma tests?

While our plan is to only provide first-class mocks for Jest tests, there are many legacy karma tests that cannot be quickly or easily converted to Jest -- particularly those which are still relying on mocking Angular services via `ngMock`.

For these tests, we are maintaining a separate set of mocks. Files with a `.karma_mock.{js|ts|tsx}` extension will be loaded _globally_ before karma tests are run.

It is important to note that this behavior is different from `jest.mock('ui/new_platform')`, which only mocks tests on an individual basis. If you encounter any failures in karma tests as a result of new platform migration efforts, you may need to add a `.karma_mock.js` file for the affected services, or add to the existing karma mock we are maintaining in `ui/new_platform`.

### Provide Legacy Platform API to the New platform plugin

#### On the server side

During migration, you can face a problem that not all API is available in the New platform yet. You can work around this by extending your
new platform plugin with Legacy API:

- create New platform plugin
- New platform plugin should expose a method `registerLegacyAPI` that allows passing API from the Legacy platform and store it in the NP plugin instance

```js
class MyPlugin {
  public async setup(core){
    return {
      registerLegacyAPI: (legacyAPI) => (this.legacyAPI = legacyAPI)
    }
  }
}
```

- The legacy plugin provides API calling `registerLegacyAPI`

```js
new kibana.Plugin({
  init(server){
    const myPlugin = server.newPlatform.setup.plugins.myPlugin;
    if (!myPlugin) {
      throw new Error('myPlugin plugin is not available.');
    }
    myPlugin.registerLegacyAPI({ ... });
  }
})
```

- The new platform plugin access stored Legacy platform API via `getLegacyAPI` getter. Getter function must have name indicating that’s API provided from the Legacy platform.

```js
class MyPlugin {
  private getLegacyAPI(){
    return this.legacyAPI;
  }
  public async setup(core){
    const routeHandler = (context, req, req) => {
      const legacyApi = this.getLegacyAPI();
      // ...
    }
    return {
      registerLegacyAPI: (legacyAPI) => (this.legacyAPI = legacyAPI)
    }
  }
}
```

#### On the client side

It's not currently possible to use a similar pattern on the client-side.
Because Legacy platform plugins heavily rely on global angular modules, which aren't available on the new platform.
So you can utilize the same approach for only *stateless Angular components*, as long as they are not consumed by a New Platform application. When New Platform applications are on the page, no legacy code is executed, so the `registerLegacyAPI` function would not be called.
>>>>>>> 9e168391af... Move apply filters popover ⇒ NP (#51566)
