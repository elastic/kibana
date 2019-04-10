# Migrating legacy plugins to the new platform

* [Overview](#overview)
  * [Architecture](#architecture)
  * [Services](#services)
  * [Integrating with other plugins](#integrating-with-other-plugins)
  * [Challenges to overcome with legacy plugins](#challenges-to-overcome-with-legacy-plugins)
  * [Plan of action](#plan-of-action)
* [Server-side plan of action](#server-side-plan-of-action)
  * [De-couple from hapi.js server and request objects](#de-couple-from-hapijs-server-and-request-objects)
  * [Introduce new plugin definition shim](#introduce-new-plugin-definition-shim)
  * [Switch to new platform services](#switch-to-new-platform-services)
  * [Migrate to the new plugin system](#migrate-to-the-new-plugin-system)
* [Browser-side plan of action](#browser-side-plan-of-action)
  * [Move UI modules into plugins](#move-ui-modules-into-plugins)
  * [Provide plugin extension points decoupled from angular.js](#provide-plugin-extension-points-decoupled-from-angularjs)
  * [Move all webpack alias imports into uiExport entry files](#move-all-webpack-alias-imports-into-uiexport-entry-files)
  * [Switch to new platform services](#switch-to-new-platform-services-1)
  * [Migrate to the new plugin system](#migrate-to-the-new-plugin-system-1)
* [Frequently asked questions](#frequently-asked-questions)
  * [Is migrating a plugin an all-or-nothing thing?](#is-migrating-a-plugin-an-all-or-nothing-thing)
  * [Do plugins need to be converted to TypeScript?](#do-plugins-need-to-be-converted-to-typescript)
  * [How is static code shared between plugins?](#how-is-static-code-shared-between-plugins)
  * [How is "common" code shared on both the client and server?](#how-is-common-code-shared-on-both-the-client-and-server)
  * [When does code go into a plugin, core, or packages?](#when-does-code-go-into-a-plugin-core-or-packages)

Make no mistake, it is going to take a lot of work to move certain plugins to the new platform. Our target is to migrate the entire repo over to the new platform throughout 7.x and to remove the legacy plugin system no later than 8.0, and this is only possible if teams start on the effort now.

The goal of this document is to guide teams through the recommended process of migrating at a high level. Every plugin is different, so teams should tweak this plan based on their unique requirements.

We'll start with an overview of how plugins work in the new platform, and we'll end with a generic plan of action that can be applied to any plugin in the repo today.

## Overview

Plugins in the new platform are not especially novel or complicated to describe. Our intention wasn't to build some clever system that magically solved problems through abstractions and layers of obscurity, and we wanted to make sure plugins could continue to use most of the same technologies they use today, at least from a technical perspective.

New platform plugins exist in the `src/plugins` and `x-pack/plugins` directories.

### Architecture

Plugins are defined as classes and exposed to the platform itself through a simple wrapper function. A plugin can have browser side code, server side code, or both. There is no architectural difference between a plugin in the browser and a plugin on the server, which is to say that in both places you describe your plugin similarly, and you interact with core and/or other plugins in the same way.

The basic file structure of a new platform plugin named "demo" that had both client-side and server-side code would be:

```
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

**[1] `kibana.json`** is a static manifest file that is used to identify the plugin and to determine what kind of code the platform should execute from the plugin:

```json
{
  "id": "demo",
  "server": true,
  "ui": true
}
```

Note that `package.json` files are irrelevant to and ignored by the new platform.

**[2] `public/index.ts`** is the entry point into the client-side code of this plugin. It must export a function named `plugin`, which will receive a standard set of core capabilities as an argument (e.g. logger). It should return an instance of its plugin definition for the platform to register at load time.

```ts
import { PluginInitializerContext } from '../../../core/public';
import { Plugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new Plugin(initializerContext);
}
```

**[3] `public/plugin.ts`** is the client-side plugin definition itself. Technically speaking it does not need to be a class or even a separate file from the entry point, but _all plugins at Elastic_ should be consistent in this way.

```ts
import { PluginInitializerContext, CoreSetup, PluginStop } from '../../../core/public';

export class Plugin {
  constructor(initializerContext: PluginInitializerContext) {
  }

  public setup(core: CoreSetup) {
    // called when plugin is setting up
  }

  public stop(core: PluginStop) {
    // called when plugin is torn down, aka window.onbeforeunload
  }
}
```

**[4] `server/index.ts`** is the entry-point into the server-side code of this plugin. It is identical in almost every way to the client-side entry-point:

```ts
import { PluginInitializerContext } from '../../../core/server';
import { Plugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new Plugin(initializerContext);
}
```

**[5] `server/plugin.ts`** is the server-side plugin definition. The _shape_ of this plugin is the same as it's client-side counter-part:

```ts
import { PluginInitializerContext, CoreSetup, CoreStop } from '../../../core/server';

export class Plugin {
  constructor(initializerContext: PluginInitializerContext) {
  }

  public setup(core: CoreSetup) {
    // called when plugin is setting up during Kibana's startup sequence
  }

  public stop(core: CoreStop) {
    // called when plugin is torn down during Kibana's shutdown sequence
  }
}
```

The platform does not impose any technical restrictions on how the internals of the plugin are architected, though there are certain considerations related to how plugins interact with core and how plugins interact with other plugins that may greatly impact how they are built.

### Services

The various independent domains that make up `core` are represented by a series of services, and many of those services expose public interfaces that are provided to _all_ plugins. Services expose different features at different parts of their _lifecycle_. We describe the lifecycle of core services and plugins with specifically-named functions on the service definition.

In the new platform, there are two lifecycle functions today: `setup` and `stop`. The `setup` functions are invoked sequentially while Kibana is starting up on the server or when it is being loaded in the browser. The `stop` functions are invoked sequentially while Kibana is gracefully shutting down on the server or when the browser tab or window is being closed.

There is no equivalent behavior to `stop` in legacy plugins, so this guide primarily focuses on migrating functionality into `setup`.

The lifecycle-specific contracts exposed by core services are always passed as the first argument to the equivalent lifecycle function in a plugin. For example, the core `UiSettings` service exposes a function `get` to all plugin `setup` functions. To use this function to retrieve a specific UI setting, a plugin just accesses it off of the first argument:

```ts
import { CoreSetup } from '../../../core/public';

export class Plugin {
  public setup(core: CoreSetup) {
    core.uiSettings.get('courier:maxShardsBeforeCryTime');
  }
}
```

Different service interfaces can and will be passed to `setup` and `stop` because certain functionality makes sense in the context of a running plugin while other types of functionality may have restrictions or may only make sense in the context of a plugin that is stopping.

For example, the `stop` function in the browser gets invoked as part of the `window.onbeforeunload` event, which means you can't necessarily execute asynchronous code here in a reliable way. For that reason, `core` likely wouldn't provide any asynchronous functions to plugin `stop` functions in the browser.

Core services that expose functionality to plugins always have their `setup` function ran before any plugins.

### Integrating with other plugins

Plugins can expose public interfaces for other plugins to consume. Like `core`, those interfaces are bound to the lifecycle functions `setup` and/or `stop`.

Anything returned from `setup` or `stop` will act as the interface, and while not a technical requirement, all Elastic plugins should expose types for that interface as well.

**foobar plugin.ts:**

```ts
export type FoobarPluginSetup = ReturnType<Plugin['setup']>;
export type FoobarPluginStop = ReturnType<Plugin['stop']>;

export class Plugin {
  public setup() {
    return {
      getFoo() {
        return 'foo';
      }
    };
  }

  public stop() {
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

With that specified in the plugin manifest, the appropriate interfaces are then available via the second argument of `setup` and/or `stop`:

**demo plugin.ts:**

```ts
import { CoreSetup, PluginStop } from '../../../core/server';
import { FoobarPluginSetup, FoobarPluginStop } from '../../foobar/server';

interface DemoSetupPlugins {
  foobar: FoobarPluginSetup
}

interface DemoStopPlugins {
  foobar: FoobarPluginStop
}

export class Plugin {
  public setup(core: CoreSetup, plugins: DemoSetupPlugins) {
    const { foobar } = plugins;
    foobar.getFoo(); // 'foo'
    foobar.getBar(); // throws because getBar does not exist
  }

  public stop(core: PluginStop, plugins: DemoStopPlugins) {
    const { foobar } = plugins;
    foobar.getFoo(); // throws because getFoo does not exist
    foobar.getBar(); // 'bar'
  }
}
```

### Challenges to overcome with legacy plugins

New platform plugins have identical architecture in the browser and on the server. Legacy plugins have one architecture that they use in the browser and an entirely different architecture that they use on the server.

This means that there are unique sets of challenges for migrating to the new platform depending on whether the legacy plugin code is on the server or in the browser.

#### Challenges on the server

The general shape/architecture of legacy server-side code is similar to the new platform architecture in one important way: most legacy server-side plugins define an `init` function where the bulk of their business logic begins, and they access both "core" and "plugin-provided" functionality through the arguments given to `init`. Rarely does legacy server-side code share stateful services via import statements.

While not exactly the same, legacy plugin `init` functions behave similarly today as new platform `setup` functions. There is no corresponding legacy concept of `stop`, however.

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

## Server-side plan of action

Legacy server-side plugins access functionality from core and other plugins at runtime via function arguments, which is similar to how they must be architected to use the new plugin system. This greatly simplifies the plan of action for migrating server-side plugins.

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

      // HTTP functionality from core
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
import { ElasticsearchPlugin } from '../elasticsearch';

interface CoreSetup {
  elasticsearch: ElasticsearchPlugin // note: we know elasticsearch will move to core
}

interface FooSetup {
  getBar(): string
}

interface PluginsSetup {
  foo: FooSetup
}

export type DemoPluginSetup = ReturnType<Plugin['setup']>;

export class Plugin {
  public setup(core: CoreSetup, plugins: PluginsSetup) {
    const serverFacade: ServerFacade = {
      plugins: {
        elasticsearch: core.elasticsearch
      }
    }

    // HTTP functionality from core
    core.http.route({ // note: we know routes will be created on core.http
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
        return `Demo ${plugins.foo.getBar()}`; // Accessing functionality from another plugin
      }
    };
  }
}
```

The legacy plugin definition is still the one that is being executed, so we now "shim" this new plugin definition into the legacy world by instantiating it and wiring it up inside of the legacy `init` function.

```ts
// index.ts

import { Plugin } from './server/plugin';

export default (kibana) => {
  return new kibana.Plugin({
    id: 'demo_plugin',

    init(server) {
      // core shim
      const coreSetup = {
        elasticsearch: server.plugins.elasticsearch,
        http: {
          route: server.route
        }
      };
      // plugins shim
      const pluginsSetup = {
        foo: server.plugins.foo
      };

      const demoSetup = new Plugin().setup(coreSetup, pluginsSetup);

      // continue to expose functionality to legacy plugins
      server.expose('getDemoBar', demoSetup.getDemoBar);
    }
  });
}
```

This introduces a layer between the legacy plugin system with hapi.js and the logic you want to move to the new plugin system. The functionality exposed through that layer is still provided from the legacy world and in some cases is still technically powered directly by hapi, but building this layer forced you to identify the remaining touch points into the legacy world and it provides you with control when you start migrating to new platform-backed services.

### Switch to new platform services

At this point, your legacy server-side plugin is described in the shape and conventions of the new plugin system, and all of the touch points with the legacy world and hapi.js have been isolated to the shims in the legacy plugin definition.

Now the goal is to replace the legacy services backing your shims with services provided by the new platform instead.

For the first time in this guide, your progress here is limited by the migration efforts within core and other plugins.

As core capabilities are migrated to services in the new platform, they are made available as lifecycle contracts to the legacy `init` function through `server.newPlatform`. This allows you to adopt the new platform service APIs directly in your legacy plugin as they get rolled out.

For the most part, care has been taken when migrating services to the new platform to preserve the existing APIs as much as possible, but there will be times when new APIs differ from the legacy equivalents. Start things off by having your core shim extend the equivalent new platform contract.

```ts
// index.ts

init(server) {
  // core shim
  const coreSetup = {
    ...server.newPlatform.setup.core,

    elasticsearch: server.plugins.elasticsearch,
    http: {
      route: server.route
    }
  };
}
```

If a legacy API differs from its new platform equivalent, some refactoring will be required. The best outcome comes from updating the plugin code to use the new API, but if that's not practical now, you can also create a facade inside your new plugin definition that is shaped like the legacy API but powered by the new API. Once either of these things is done, that override can be removed from the shim.

Eventually, all overrides will be removed and your `coreSetup` shim is entirely powered by `server.newPlatform.setup.core`.

```ts
init(server) {
  // core shim
  const coreSetup = {
    ...server.newPlatform.setup.core
  };
}
```

At this point, your legacy server-side plugin logic is no longer coupled to the legacy core.

A similar approach can be taken for your plugins shim. First, update your plugin shim in `init` to extend `server.newPlatform.setup.plugins`.

```ts
init(server) {
  // plugins shim
  const pluginsSetup = {
    ...server.newPlatform.setup.plugins,
    foo: server.plugins.foo
  };
}
```

As the plugins you depend on are migrated to the new platform, their contract will be exposed through `server.newPlatform`, so the legacy override should be removed. Like in core, plugins should take care to preserve their existing APIs to make this step as seamless as possible.

It is much easier to reliably make breaking changes to plugin APIs in the new platform than it is in the legacy world, so if you're planning a big change, consider doing it after your dependent plugins have migrated rather than as part of your own migration.

Eventually, all overrides will be removed and your `pluginsSetup` shim is entirely powered by `server.newPlatform.setup.plugins`.

```ts
init(server) {
  // plugins shim
  const pluginsSetup = {
    ...server.newPlatform.setup.plugins
  };
}
```

At this point, your legacy server-side plugin logic is no longer coupled to legacy plugins.

### Migrate to the new plugin system

With both shims converted, you are now ready to complete your migration to the new platform.

Many plugins will copy and paste all of their plugin code into a new plugin directory and then delete their legacy shims.

With the previous steps resolved, this final step should be easy, but the exact process may vary plugin by plugin, so when you're at this point talk to the platform team to figure out the exact changes you need.


## Browser-side plan of action

It is generally a much greater challenge preparing legacy browser-side code for the new platform than it is server-side, and as such there are a few more steps. The level of effort here is proportional to the extent to which a plugin is dependent on angular.js.

To complicate matters further, a significant amount of the business logic in Kibana's client-side code exists inside the `ui/public` directory (aka ui modules), and all of that must be migrated as well. Unlike the server-side code where the order in which you migrated plugins was not particularly important, it's important that UI modules be addressed as soon as possible.

Also unlike the server-side migration, we won't concern ourselves with creating shimmed plugin definitions that then get copied over to complete the migration.

### Move UI modules into plugins

Everything inside of the `ui/public` directory is going to be dealt with in one of the following ways:

* Deleted because it doesn't need to be used anymore
* Moved to or replaced by something in core that isn't coupled to angular
* Moved to or replaced by an extension point in a specific plugin that "owns" that functionality
* Copied into each plugin that depends on it and becomes an implementation detail there

To rapidly define ownership and determine interdependencies, UI modules should move to the most appropriate plugins to own them. Modules that are considered "core" can remain in the ui directory as the platform team works to move them out.

Concerns around ownership or duplication of a given module should be raised and resolved with the appropriate team so that the code is either duplicated to break the interdependency or a team agrees to "own" that extension point in one of their plugins and the module moves there.

A great outcome is a module being deleted altogether because it isn't used or it was used so lightly that it was easy to refactor away.

### Provide plugin extension points decoupled from angular.js

There will be no global angular module in the new platform, which means none of the functionality provided by core will be coupled to angular. Since there is no global angular module shared by all applications, plugins providing extension points to be used by other plugins can not couple those extension points to angular either.

All teams that own a plugin are strongly encouraged to remove angular entirely, but if nothing else they must provide non-angular-based extension points for plugins.

One way to address this problem is to go through the code that is currently exposed to plugins and refactor away all of the touch points into angular.js. This might be the easiest option in some cases, but it might be hard in others.

Another way to address this problem is to create an entirely new set of plugin APIs that are not dependent on angular.js, and then update the implementation within the plugin to "merge" the angular and non-angular capabilities together. This is a good approach if preserving the existing angular API until we remove the old plugin system entirely is of critical importance. Generally speaking though, the removal of angular and introduction of a new set of public plugin APIs is a good reason to make a breaking change to the existing plugin capabilities. Make sure the PRs are tagged appropriately so we add these changes to our plugin changes blog post for each release.

Please talk with the platform team when formalizing _any_ client-side extension points that you intend to move to the new platform as there are some bundling considerations to consider.

### Move all webpack alias imports into uiExport entry files

Existing plugins import three things using webpack aliases today: services from ui/public (`ui/`), services from other plugins (`plugins/`), and uiExports themselves (`uiExports/`). These webpack aliases will not exist once we remove the legacy plugin system, so part of our migration effort is addressing all of the places where they are used today.

In the new platform, dependencies from core and other plugins will be passed through lifecycle functions in the plugin definition itself. In a sense, they will be run from the "root" of the plugin.

With the legacy plugin system, extensions of core and other plugins are handled through entry files defined as uiExport paths. In other words, when a plugin wants to serve an application (a core-owned thing), it defines a main entry file for the app via the `app` uiExport, and when a plugin wants to extend visTypes (a plugin-owned thing), they do so by specifying an entry file path for the `visType` uiExport.

Each uiExport path is an entry file into one specific set of functionality provided by a client-side plugin. All webpack alias-based imports should be moved to these entry files, where they are appropriate. Moving a deeply nested webpack alias-based import in a plugin to one of the uiExport entry files might require some refactoring to ensure the dependency is now passed down to the appropriate place as function arguments instead of via import statements.

### Switch to new platform services

At this point, your plugin has one or more uiExport entry files that together contain all of the webpack alias-based import statements needed to run your plugin. Each one of these import statements is either a service that is or will be provided by core or a service provided by another plugin.

As new non-angular-based APIs are added, update your entry files to import the correct service API. The service APIs provided directly from the new platform can be imported through the `ui/new_platform` module for the duration of this migration. As new services are added, they will also be exposed there. This includes all core services as well as any APIs provided by real new platform plugins.

Once all of the existing webpack alias-based imports in your plugin switch to `ui/new_platform`, it no longer depends directly on the legacy "core" features or other legacy plugins, so it is ready to officially migrate to the new platform.

### Migrate to the new plugin system

With all of your services converted, you are now ready to complete your migration to the new platform.

Many plugins at this point will create a new plugin definition class and copy and paste the code from their various uiExport entry files directly into the new plugin class. The legacy uiExport entry files can then simply be deleted.

With the previous steps resolved, this final step should be easy, but the exact process may vary plugin by plugin, so when you're at this point talk to the platform team to figure out the exact changes you need.

## Frequently asked questions

### Is migrating a plugin an all-or-nothing thing?

It doesn't have to be. Within the Kibana repo, you can have a new platform plugin with the same name as a legacy plugin.

Technically speaking, you could move all of your server-side code to the new platform and leave the legacy browser-side code where it is. You can even move only a portion of code on your server at a time, like on a route by route basis for example.

For any new plugin APIs being defined as part of this process, it is recommended to create those APIs in new platform plugins, and then core will pass them down into the legacy world to be used there. This leaves one less thing you need to migrate.

### Do plugins need to be converted to TypeScript?

No. That said, the migration process will require a lot of refactoring, and TypeScript will make this dramatically easier and less risky. Independent of the new platform effort, our goals are to convert the entire Kibana repo to TypeScript over time, so now is a great time to do it.

At the very least, any plugin exposing an extension point should do so with first-class type support so downstream plugins that _are_ using TypeScript can depend on those types.

### How is static code shared between plugins?

Plugins are strongly discouraged from sharing static code for other plugins to import. There will be times when it is necessary, so it will remain possible, but it has serious drawbacks that won't necessarily be clear at development time.

1. When a plugin is uninstalled, its code is removed from the filesystem, so all imports referencing it will break. This will result in Kibana failing to start or load, and there is no way to recover beyond installing the missing plugin or disabling the plugin with the broken import.
2. When a plugin is disabled, its static exports will still be importable by any other plugin. This can result in undesirable effects where it _appears_ like a plugin is enabled when it is not. In the worst case, it can result in an unexpected user experience where features that should have been disabled are not.
3. Code that is statically imported will be _copied_ into the plugin that imported it. This will bloat your plugin's client-side bundles and its footprint on the server's file system. Often today client-side imports expose a global singleton, and due to this copying behavior that will no longer work.

If you must share code statically, regardless of whether static code is on the server or in the browser, it can be imported via relative paths.

For some background, this has long been problematic in Kibana for two reasons:

* Plugin directories were configurable, so there was no reliably relative path for imports across plugins and from core. This has since been addressed and all plugins in the Kibana repo have reliable locations relative to the Kibana root.
* The `x-pack` directory moved into `node_modules` at build time, so a relative import from `x-pack` to `src` that worked during development would break once a Kibana distribution was built. This is still a problem today, but the fix is in flight via issue [#32722](https://github.com/elastic/kibana/pull/32722).

Any code not exported via the index of either the `server` or `public` directories should never be imported outside that plugin as it should be considered unstable and subject to change at any time.

### How is "common" code shared on both the client and server?

There is no formal notion of "common" code that can safely be imported from either client-side or server-side code. However, if a plugin author wishes to maintain a set of code in their plugin in a single place and then expose it to both server-side and client-side code, they can do so by exporting in the index files for both the `server` and `public` directories.

The benefit of this approach is that the details of where code lives and whether it is accessible in multiple runtimes is an implementation detail of the plugin itself. A plugin consumer that is writing client-side code only ever needs to concern themselves with the client-side contracts being exposed, and the same can be said for server-side contracts on the server.

A plugin author that decides some set of code should diverge from having a single "common" definition can now safely change the implementation details without impacting downstream consumers.

### When does code go into a plugin, core, or packages?

This is an impossible question to answer definitively for all circumstances. For each time this question is raised, we must carefully consider to what extent we think that code is relevant to almost everyone developing in Kibana, what license the code is shipping under, which teams are most appropriate to "own" that code, is the code stateless etc.

As a general rule of thumb, most code in Kibana should exist in plugins. Plugins are the most obvious way that we break Kibana down into sets of specialized domains with controls around interdependency communication and management. It's always possible to move code from a plugin into core if we ever decide to do so, but it's much more disruptive to move code from core to a plugin.

There is essentially no code that _can't_ exist in a plugin. When in doubt, put the code in a plugin.

After plugins, core is where most of the rest of the code in Kibana will exist. Functionality that's critical to the reliable execution of the Kibana process belongs in core. Services that will widely be used by nearly every non-trivial plugin in any Kibana install belong in core. Functionality that is too specialized to specific use cases should not be in core, so while something like generic saved objects is a core concern, index patterns are not.

The packages directory should have the least amount of code in Kibana. Just because some piece of code is not stateful doesn't mean it should go into packages. The packages directory exists to aid us in our quest to centralize as many of our owned dependencies in this single monorepo, so it's the logical place to put things like Kibana specific forks of node modules or vendor dependencies.
