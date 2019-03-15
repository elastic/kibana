# Migrating legacy plugins to the new platform

* Overview
  * Architectural
  * Services
  * Integrating with other plugins
  * Challenges to overcome with legacy plugins
  * Plan of action
* Server-side plan of action
  * De-couple from hapi.js server and request objects
  * Introduce new plugin definition shim
  * Switch to new platform services
  * Migrate to the new plugin system
* Browser-side plan of action
  * Move UI modules into plugins
  * Provide plugin extension points decoupled from angular.js
  * Move all webpack alias imports into apiExport entry files
  * Switch to new platform services
  * Migrate to the new plugin system
* Frequently asked questions
  * Is migrating a plugin an all-or-nothing thing?
  * Do plugins need to be converted to TypeScript?
  * How is static code shared between plugins?
  * How is "common" code shared on both the client and server?
  * When does code go into a plugin, core, or packages?

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
import { PluginInitializerContext, CoreSetup, PluginStop } from '../../../core/server';

export class Plugin {
  constructor(initializerContext: PluginInitializerContext) {
  }

  public setup(core: CoreSetup) {
    // called when plugin is setting up during Kibana's startup sequence
  }

  public stop(core: PluginStop) {
    // called when plugin is torn down during Kibana's shutdown sequence
  }
}
```

The platform does not impose any technical restrictions on how the internals of the plugin are architected, though there are certain considerations related to how plugins interact with core and how plugins interact with other plugins that may greatly impact how they are built.

### Services

The various independent domains that make up `core` are represented by a series of services, and many of those services expose public interfaces that are provided to _all_ plugins via the first argument of their `setup` and `stop` functions. The interface varies from service to service, but it is always accessed through this argument.

For example, the core `UiSettings` service exposes a function `get` to all plugin `setup` functions. To use this function to retrieve a specific UI setting, a plugin just accesses it off of the first argument:

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

### Integrating with other plugins

Plugins can expose public interfaces for other plugins to consume. Like `core`, those interfaces are bound to `setup` and/or `stop`.

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
    getBar() {
      return 'bar';
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

interface DemoSetupDependencies {
  foobar: FoobarPluginSetup
}

interface DemoStopDependencies {
  foobar: FoobarPluginStop
}

export class Plugin {
  public setup(core: CoreSetup, dependencies: DemoSetupDependencies) {
    const { foobar } = dependencies;
    foobar.getFoo(); // 'foo'
    foobar.getBar(); // throws because getBar does not exist
  }

  public stop(core: PluginStop, dependencies: DemoStopDependencies) {
    const { foobar } = dependencies;
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

Once those things are finished for any given plugin, it can offically be switched to the new plugin system.

## Server-side plan of action

Legacy server-side plugins access functionality from core and other plugins at runtime via function arguments, which is similar to how they must be architected to use the new plugin system. This greatly simplifies the plan of action for migrating server-side plugins.

### De-couple from hapi.js server and request objects

Most integrations with core and other plugins occur through the hapi.js `server` and `request` objects, and neither of these things are exposed through the new platform, so tackle this problem first.

Fortunately, decoupling from these objects is relatively straightforward.

The server object is introduced to your plugin in its legacy `init` function, so in that function you will "pick" the functionality you actually use from `server` and attach it to a new interface, which you will then pass in all the places you had previously been passing `server`.

The `request` object is introduced to your plugin in every route handler, so at the root of every route handler, you will create a new interface by "picking" the request information (e.g. body, headers) and core and plugin capabilities from the `request` object that you actually use and pass that in all the places you previously were passing `request`.

Any calls to mutate either the server or request objects (e.g. server.decorate()) will be moved toward the root of the legacy `init` function if they aren't already there.

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

This change might seem trivial, but its important for two reasons.

First, the business logic built into `search` is now coupled to an object you created manually and have complete control over rather than hapi itself. This will allow us in a future step to replace the dependency on hapi without necessarily having to modify the business logic of the plugin.

Second, it forced you to clearly define the dependencies you have on capabilities provided by core and by other plugins. This will help in a future step when you must replace those capabilities with services provided through the new platform.

### Introduce new plugin definition shim

While most plugin logic is now decoupled from hapi, the plugin definition itself still uses hapi to expose functionality for other plugins to consume and accesses functionality from both core and a different plugin.

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

interface DependenciesSetup {
  foo: FooSetup
}

export type DemoPluginSetup = ReturnType<Plugin['setup']>;

export class Plugin {
  public setup(core: CoreSetup, dependencies: DependenciesSetup) {
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
        return `Demo ${dependencies.foo.getBar()}`; // Accessing functionality from another plugin
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
      const dependenciesSetup = {
        foo: server.plugins.foo
      };

      const demoSetup = new Plugin().setup(coreSetup, dependenciesSetup);

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

At this point, your legacy server-side plugin's logic is no longer coupled to the legacy core.

A similar approach can be taken for your plugins shim. First, update your plugin shim in `init` to extend `server.newPlatform.setup.plugins`.

```ts
init(server) {
  // plugins shim
  const dependenciesSetup = {
    ...server.newPlatform.setup.plugins,
    foo: server.plugins.foo
  };
}
```

As the plugins you depend on are migrated to the new platform, their contract will be exposed through `server.newPlatform`, so the legacy override should be removed. Like in core, plugins should take care to preserve their existing APIs to make this step as seamless as possible.

It is much easier to reliably make breaking changes to plugin APIs in the new platform than it is in the legacy world, so if you're planning a big change, consider doing it after your dependent plugins have migrated rather than as part of your own migration.

Eventually, all overrides will be removed and your `dependenciesSetup` shim is entirely powered by `server.newPlatform.setup.plugins`.

```ts
init(server) {
  // plugins shim
  const dependenciesSetup = {
    ...server.newPlatform.setup.plugins
  };
}
```

At this point, your legacy server-side plugin's logic is no longer coupled to legacy plugins.

### Migrate to the new plugin system

With both shims converted, you are now ready to complete your migration to the new platform.

Details to come...


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

Another way to address this problem is to create an entirely new set of plugin APIs that are not dependendent on angular.js, and then update the implementation within the plugin to "merge" the angular and non-angular capabilities together. This is a good approach if preserving the existing angular API until we remove the old plugin system entirely is of critical importance. Generally speaking though, the removal of angular and introduction of a new set of public plugin APIs is a good reason to make a breaking change to the existing plugin capabilities. Make sure the PRs are tagged appropriate so we add these changes to our plugin changes blog post for each release.

### Move all webpack alias imports into apiExport entry files

Existing plugins import three things using webpack aliases today: services from ui/public (`ui/`), services from other plugins (`plugins/`), and uiExports themselves (`uiExports/`). These webpack aliases will not exist once we remove the legacy plugin system, so part of our migration effort is addressing all of the places where they are used today.

In the new platform, dependencies from core and other plugins will be passed through lifecycle functions in the plugin definition itself. In a sense, they will be run from the "root" of the plugin.

With the legacy plugin system, extensions of core and other plugins are handled through entry files defined as uiExport paths. In other words, when a plugin wants to serve an application (a core-owned thing), it defines a main entry file for the app via the `app` uiExport, and when a plugin wants to extend visTypes (a plugin-owned thing), they do so by specifying an entry file path for the `visType` uiExport.

Each uiExport path is an entry file into one specific set of functionality provided by a client-side plugin. All webpack alias-based imports should be moved to these entry files, where they are appropriate. Moving a deeply nested webpack alias-based import in a plugin to one of the uiExport entry files might require some refactoring to ensure the dependency is now passed down to the appropriate place as function arguments instead of via import statements.

### Switch to new platform services



### Migrate to the new plugin system

With all of your services converted, you are now ready to complete your migration to the new platform.

Details to come...


















# Old stuff below this line.

Most of the stuff below is still relevant, but I'm mid-overhaul of the structure of this document and the content below is from a prior draft.

### Plan of action

In order to move a legacy plugin to the new plugin system, the challenges on the server and in the browser must be addressed. Fortunately, **the hardest problems can be solved in legacy plugins today** without consuming the new platform at all.

At a high level, the bulk of the migration work can be broken down into two phases.

First, refactor the plugin's architecture to isolate the legacy behaviors mentioned in the "Challenges to overcome with legacy plugins" section above. In practice, this involves moving all of the legacy imports and hapi god object references out of the business logic of your plugin and into a legacy _shim_.

Second, update the consuming code of core services within the plugin to that of the new platform. This can be done in the legacy world, though it is dependent on the relevant services actually existing.

Once those two things are done, the effort involved in actually updating your plugin to execute in the new plugin system is tiny and non-disruptive.

Before you do any of that, there are two other things that will make all steps of this process a great deal easier and less risky: switch to TypeScript, and remove your dependencies on angular.

#### TypeScript

The new platform does not _require_ plugins to be built with TypeScript, but all subsequent steps of this plan of action are more straightforward and carry a great deal less risk if the code is already converted to TypeScript.

TypeScript is a superset of JavaScript, so if your goal is the least possible effort, you can move to TypeScript with very few code changes mostly by adding `any` types all over the place. This isn't really any better than regular JavaScript, but simply having your code in `.ts` files means you can at least take advantage of the types that are exported from core and other plugins. This bare minimum approach won't help you much for the architectural shifts, but it could be a great help to you in reliably switching over to new platform services.

### De-angular

Angular is not a thing in the new platform. Hopefully your plugin began moving away from angular long ago, but if not, you're in a tight spot.

If your plugin is registering some sort of global behavior that technically crosses application boundaries, then you have no choice but to get rid of angular. In this case, you're probably best off dealing with this before proceeding with the rest of action plan.

If your plugin is using angular only in the context of its own application, then removing angular is likely not a definitive requirement for moving to the new platform. In this case, you will need to refactor your plugin to initialize an entirely standalone angular module that serves your application. You will need to create custom wrappers for any of the angular services you previously relied on (including those through `Private()`) inside your own plugin.

At this point, keeping angular around is not the recommended approach. If you feel you must do it, then talk to the platform team directly and we can help you craft a plan.

We recommend that _all_ plugins treat moving away from angular as a top-most priority if they haven't done so already.

### Architectural changes with legacy "shim"

The bulk of the migration work for most plugins will be changing the way the plugin is architected so dependencies from core and other plugins flow in via the same entry point. This effort is relatively straightforward on the server, but it can be a tremendous undertaking for client-side code in some plugins.

#### Server-side architectural changes

Legacy server-side plugins access functionality from core and other plugins at runtime via function arguments, which is similar to how they must be architected to use the new plugin system.

Let's start with a legacy server-side plugin definition that exposes functionality for other plugins to consume and accesses functionality from both core and a different plugin.

```ts
export default (kibana) => {
  return new kibana.Plugin({
    id: 'demo_plugin',

    init(server) {
      server.route({
        path: '/api/demo_plugin/search',
        method: 'POST',
        async handler(request) {
          const { elasticsearch } = server.plugins;
          return elasticsearch.getCluster('admin').callWithRequest(request, 'search');
        }
      });

      server.expose('getDemoBar', () => {
        return `Demo ${server.plugins.foo.getBar()}`;
      });
    }
  });
}
```

If we were to express this same set of capabilities in a shape that's more suitable to the new plugin system, it would look something like this:

```ts
import { CoreSetup } from '../../core/server';
import { FooPluginSetup } from '../foo/server';

interface DemoSetupDependencies {
  foo: FooPluginSetup
}

export type DemoPluginSetup = ReturnType<Plugin['setup']>;

export class Plugin {
  public setup(core: CoreSetup, dependencies: DemoSetupDependencies) {
    core.http.route({
      path: '/api/demo_plugin/search',
      method: 'POST',
      async handler(request) {
        const { elasticsearch } = core; // note, elasticsearch is moving to core
        return elasticsearch.getCluster('admin').callWithRequest(request, 'search');
      }
    });

    return {
      getDemoBar() {
        return `Demo ${dependencies.foo.getBar()}`;
      }
    };
  }
}
```

Let's break down the key differences in these examples.

##### Defining the plugin

The new plugin is defined as a class `Plugin`, whereas the legacy plugin exported a default factory function that instantiated a Kibana-supplied plugin class. Note that there is no id specified on the plugin class itself:

```ts
// before
export default (kibana) => {
  return new kibana.Plugin({
    // ...
  });
}

// after
export class Plugin {
  // ...
}
```

##### Starting the plugin up

The new plugin definition uses `setup` instead of `init`, and rather than getting the hapi server object as its only argument, it gets two arguments: the core services and a dependency on another plugin.

```ts
// before
init(server) {
  // ...
}

//after
public setup(core: CoreSetup, dependencies: DemoSetupDependencies) {
  // ...
}
```

##### Accessing core services

Rather than accessing "core" functions like HTTP routing directly on a hapi server object, the new plugin accesses core functionality through the top level services it exposes in the first argument to `setup`. In the case of HTTP routing, it uses `core.http`.

```ts
// before
server.route({
  path: '/api/demo_plugin/search',
  method: 'POST',
  async handler(request) {
    const { elasticsearch } = server.plugins;
    return elasticsearch.getCluster('admin').callWithRequest(request, 'search');
  }
});

// after
core.http.route({
  path: '/api/demo_plugin/search',
  method: 'POST',
  async handler(request) {
    const { elasticsearch } = core; // note, elasticsearch is moving to core
    return elasticsearch.getCluster('admin').callWithRequest(request, 'search');
  }
});
```

##### Exposing services for other plugins

Legacy plugins on the server might expose functionality or services to other plugins by invoking the `expose` function on the hapi `server` object. This can happen at any time throughout the runtime of Kibana which makes it less than reliable.

New plugins return the contract (if any) that they wish to make available to downstream plugins. This ensures the entirety of a plugin's start contract is available upon completion of its own `setup` function. It also makes it much easier to provide type definitions for plugin contracts.

```ts
// before
server.expose('getDemoBar', () => {
  // ...
});

// after
return {
  getDemoBar() {
    // ...
  }
};
```

##### Accessing plugin services

In server-side code of legacy plugins, you once again use the hapi `server` object to access functionality that was exposed by other plugins. In new plugins, you access the exposed functionality in a similar way but on the second argument to `setup` that is dedicated only to injecting plugin capabilities.

```ts
// before
server.plugins.foo.getBar()

// after
dependencies.foo.getBar()
```

##### Static files

One other thing worth noting in this example is how a new plugin will consume static files from core or other plugins, and also how it will expose static files for other plugins.

This is done through standard modules and relative imports.

```ts
// import CoreSetup type from core server
import { CoreSetup } from '../../core/server';

// import FooPluginSetup type from plugin foo
import { FooPluginSetup } from '../foo/server';

// export DemoPluginSetup type for downstream plugins, based on return value of setup()
export type DemoPluginSetup = ReturnType<Plugin['setup']>;
```

While these particular examples involve only types, the exact same pattern should be followed for those rare situations when a plugin exposes static functionality for plugins to consume.

##### Rule of thumb for server-side changes

Outside of the temporary shim, does your plugin code rely directly on hapi.js? If not, you're probably good to go.

#### Client-side architectural changes

Client-side legacy plugin code is where things get weird, but the approach is similar - a new plugin definition wraps the business logic of the plugin while legacy functionality is "shimmed" temporarily. Ultimately, there are three high levels goals for client-side architectural changes:

1. Move all webpack alias imports (`ui/`, `plugin/`, `uiExports/`) into the root shim(s)
2. Adopt global new plugin definitions for all plugins
3. Source of truth for all stateful actions and configuration should originate from new plugin definition

How you accomplish these things varies wildly depending on the plugin's current implementation and functionality.

Every plugin will add their global plugin definition via a `hack` uiExport, which will ensure that the plugin definition is always loaded for all applications. This is inline with how the plugin service works in the new platform.

##### Extending an application

Let's take a look at a simple plugin that registers functionality to be used in an application. This is done by configuring a uiExport and accessing a registry through a `ui/registry` webpack alias:

```js
// demo/index.js
{
  uiExports: {
    foo: 'plugins/demo/some_file'
  }
}

// demo/public/some_file.js
import chrome from 'ui/chrome';
import { FooRegistryProvider } from 'ui/registry/foo';

FooRegistryProvider.register(() => {
  return {
    url: chrome.getBasePath() + '/demo_foo'
  };
});
```

To update this plugin, we'll create a plugin definition in a hack uiExport, and we'll move the registration logic there where we'll create some shims into the legacy world.

```ts
// demo/index.js
{
  uiExports: {
    hacks: [
      'plugins/demo/hacks/shim_plugin'
    ]
  }
}

// demo/public/plugin.js
import { CoreSetup } from '../../core/public';
import { FooPluginSetup } from '../foo/public';

interface DemoSetupDependencies {
  foo: FooPluginSetup
}

export class Plugin {
  public setup(core: CoreSetup, dependencies: DemoSetupDependencies) {
    const { chrome } = core;

    dependencies.foo.registerFoo(() => {
      return {
        url: chrome.getBasePath() + '/demo_foo'
      };
    });
  }
}

// demo/public/hacks/shim_plugin.js
import chrome from 'ui/chrome';
import { FooRegistryProvider } from 'ui/registry/foo';
import { Plugin } from '../plugin';

const core = {
  chrome: {
    getBasePath() {
      return chrome.getBasePath();
    }
  }
};
const dependencies = {
  foo: {
    registerFoo(fn) {
      FooRegistryProvider.register(fn);
    }
  }
};

new Plugin().setup(core, dependencies);
```

The `shim_plugin.js` file is take on the role of the plugin service in the new platform. It wires up the plugin definition with the dependencies that plugin has on core (i.e. `chrome`) and other plugins (i.e. `foo`). All of the webpack alias imports needed by this plugin have been moved into the shim, and the `plugin.js` code is pristine.

##### Creating an extension

Legacy plugins today extend applications by adding functionality through a registry in a uiExport. In the previous example, you saw how to shim this relationship from the extending side into the new plugin definition. Now, let's see how to shim the relavant uiExport registry from the side of the plugin that "owns" it.

We need to update the registry to expose access to state as an observable. In most cases, this will only affect the implementation details of the owning plugin. This is how state should be shared between plugins in the new platform, but more importantly it is necessary now to move away from the uiExports extension while the order of legacy plugin execution is not determined by a dependency graph.

In order to support dependent legacy plugins that have not yet been updated, we continue to initiate the uiExport in the app entry file. Once all downstream plugins have been updated to access the registry in a shimmed plugin definition, the `uiExports/` import statement from the app entry file can be removed.

```ts
// foo/public/plugin.ts
import { ReplaySubject } from 'rxjs';

export type FooPluginSetup = ReturnType<Plugin['setup']>;

export type FooFn = () => void;

export class Plugin {
  public constructor() {
    this.fooRegistry = [];
    this.foos$ = new ReplaySubject(1);
  }

  public setup() {
    return {
      foos$: this.foos$.asObservable(),
      registerFoo(fn) {
        this.fooRegistry.push(fn);
        this.fooSubject.next([ ...this.fooRegistry ]);
      }
    };
  }

  public stop() {
    this.foos$.complete();
  }
}


// foo/hacks/shim_plugin.ts
import { Plugin } from '../plugin';

const plugin = new Plugin();
const setup = plugin.setup();

require('ui/registry/foo').__temporaryShim__(setup);


// ui/public/registry/foo.ts
import { FooPluginSetup, FooFn } from '../../../core_plugins/foo/public/plugin';

// legacy plugin order is not guaranteed, so we store a buffer of registry
// calls and then empty them out when the owning plugin shims this module with
// proper state
let temporaryRegistry = [];
let setup;
export function __temporaryShim__(fooSetup: FooPluginSetup) {
  if (setup) {
    throw new Error('Foo registry already shimmed');
  }
  setup = fooSetup;
  temporaryRegistry.forEach(fn => setup.registerFoo(fn));
  temporaryRegistry = undefined;
}

export const FooRegistryProvider = {
  register(fn: FooFn) {
    if (setup) {
      setup.registerFoo(fn);
    } else {
      temporaryRegistry.push(fn);
    }
  },
  getAll() {
    if (setup) {
      return setup.foos$;
    } else {
      throw new Error('Foo registry not yet shimmed');
    }
  }
};


// foo/public/index.js
import 'uiExports/foo'; // to continue support for non-updated plugins

import { FooRegistryProvider } from 'ui/registry/foo';
FooRegistryProvider.getAll().subscribe(foos => {
  // do something with array foos
});
```

##### Plugin with generic application

It is difficult to provide concrete guidance for migrating an application because most applications have unique architectures and bootstrapping logic.

In the new plugin system, a plugin registers an application via the application service by providing an asyncronous `mount` function that core invokes when a user attempts to load the app. In this mounting function, a plugin would use an async import statement to load the application code so it wasn't loaded by the browser until it was first navigated to.

The basic interface would be something similar to:

```ts
async function mount({ domElement }) {
  const { bootstrapApp } = await import('/application');

  const unmount = bootstrapApp({ domElement });

  // returns a function that cleans up after app when navigating away
  return unmount;
}

// application.ts
export function bootstrapApp({ domElement }) {
  // all of the application-specific setup logic
  // application renders into the given dom element
}
```

This pattern provides flexibility for applications to have bootstrap logic and technologies that are not prescribed by or coupled to core itself.

Applications in legacy plugins are instead resolved on the server-side and then get served to the client via application-specific entry files. Migrating applications involves adopting the above pattern for defining mounting logic in the global plugin definition hack, and then updating the legacy app entry file to behave like the new platform core will by invoking the mounting logic.

As before, shims will need to be created for legacy integrations with core and other plugins, and all webpack alias-based imports will need to move to those shims.

**React application:**

Let's look at an example for a react application.

```ts
// demo/public/plugin.js
export class Plugin {
  setup(core) {
    const { I18nContext } = core.i18n;
    core.applications.register('demo', async function mount(domElement) {
      const { bootstrapApp } = await import('../application');
      return bootstrapApp({ domElement, I18nContext });
    });
  }
}


// demo/public/application.js
import React from 'react';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import ReactDOM from 'react-dom';

import { configureStore } from './store';
import { Main } from './components/Main';

import './style/demo_custom_styles.css';

export function bootstrapApp({ domElement, I18nContext }) {
  const store = configureStore();

  ReactDOM.render(
    <I18nContext>
      <Provider store={store}>
        <Router>
          <Main />
        </Router>
      </Provider>
    </I18nContext>,
    domElement
  );

  return function destroyApp() {
    ReactDOM.unmountComponentAtNode(domElement);
  }
}


// demo/public/hacks/shim_plugin.js
import { coreSetup } from 'ui/core';
import { I18nContext } from 'ui/i18n';
import { Plugin } from '../plugin';

const core = {
  ...coreSetup,
  i18n: {
    I18nContext
  }
};

new Plugin().setup(core);


// demo/public/index.js
import { coreInternals } from 'ui/core';
import 'ui/autoload/styles';

chrome.setRootController(function ($element) {
  coreInternals.applications.mountApp('demo', $element[0]);
});
```

The plugin and application bundles do not use webpack aliases for imports. Stateful services are passed around as function arguments. The plugin definition shim wires up the necessary bits of the core setup contract, and the legacy app entry file shims the app-specific behaviors that ultimately will move into core (e.g. mounting the application) or will go away entirely (ui/autoload/styles).

**Angular application:**

WIP

Angular applications must be handled a little differently since angular is still temporarily a part of core, and you cannot easily embed isolated angular applications within one another at runtime. Angular will be moved out of core and into individual plugins in 7.x, but in the meantime the angular application logic should continue to be bootstrapped through the legacy app entry file.

The best possible outcome is for applications to remove angular entirely in favor of React, but if the intention is to preserve the angular app post-migration, then the focus today should be on removing dependencies on external services (provided by core or other plugins) that are injected through the angular dependency injection mechanism.

In the future, services provided by core and other plugins will not be available automatically via the angular dependency injection system. To prepare for that inevitability, angular applications should be updated to define those services themselves. For now, this can be done through shims.

Let's consider the following example that relies on the core `chrome` service accessed through the angular dependency injection mechanism.

```js
// demo/public/index.js
import routes from 'ui/routes';

import './directives';
import './services';

routes.enable();
routes.when('/demo', {
  controller(chrome) {
    this.basePath = chrome.getBasePath();
  }
});
```

The demo application does not "own" `chrome`, so it won't exist automatically in the future. To continue using it, the demo application will need to configure it




# Random temporary idea thrashing below


```js
// visualize/index.js
// example of app entry file for upgraded angular plugin
import chrome from 'ui/chrome';
import routes from 'ui/routes';
import { uiModules } from 'ui/modules';

import 'uiExports/visTypes';

import 'ui/autoload/all';
import './visualize';
import 'ui/vislib';
import { showAppRedirectNotification } from 'ui/notify';

import { application } from 'ui/core';

chrome.setRootController(class {
  constructor($element) {
    core.applications.mountApp('demo', $element[0]);
  }
});

import template from './templates/index.html';
chrome.setRootTemplate(template);
initTimepicker().then(() => {

})


routes.enable();

routes
  .otherwise({
    redirectTo: `/${chrome.getInjected('kbnDefaultAppId', 'discover')}`
  });

uiModules.get('kibana').run(showAppRedirectNotification);

bootstrapAngularChrome();
```


##### Rule of thumb for client-side changes

Outside of the temporary shim, does your plugin code rely directly on code imported from webpack aliases (e.g. `import from 'plugins/...'` or `import from 'ui/...'`)? If not, you're probably good to go.
