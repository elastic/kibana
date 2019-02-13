# Migrating legacy plugins to the new platform

* Overview
  * Architectural
  * Services
  * Integrating with other plugins
  * Challenges to overcome with legacy plugins
* Plan of action
  * TypeScript
  * De-angular
  * Architectural changes with legacy "shim"
  * Switch to new platform services
  * Migrate to the new platform

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
import { PluginInitializerContext, PluginName, PluginStart, PluginStop } from '../../../core/public';

export class Plugin {
  constructor(initializerContext: PluginInitializerContext) {
  }

  public start(core: PluginStart) {
    // called when plugin is started up, aka when Kibana is loaded
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
import { PluginInitializerContext, PluginName, PluginStart, PluginStop } from '../../../core/server';

export class Plugin {
  constructor(initializerContext: PluginInitializerContext) {
  }

  public start(core: PluginStart) {
    // called when plugin is started up during Kibana's startup sequence
  }

  public stop(core: PluginStop) {
    // called when plugin is torn down during Kibana's shutdown sequence
  }
}
```

The platform does not impose any technical restrictions on how the internals of the plugin are architected, though there are certain considerations related to how plugins interact with core and how plugins interact with other plugins that may greatly impact how they are built.

### Services

The various independent domains that make up `core` are represented by a series of services, and many of those services expose public interfaces that are provided to _all_ plugins via the first argument of their `start` and `stop` functions. The interface varies from service to service, but it is always accessed through this argument.

For example, the core `UiSettings` service exposes a function `get` to all plugin `start` functions. To use this function to retrieve a specific UI setting, a plugin just accesses it off of the first argument:

```ts
import { PluginName, PluginStart } from '../../../core/public';

export class Plugin {
  public start(core: PluginStart) {
    core.uiSettings.get('courier:maxShardsBeforeCryTime');
  }
}
```

Different service interfaces can and will be passed to `start` and `stop` because certain functionality makes sense in the context of a running plugin while other types of functionality may have restrictions or may only make sense in the context of a plugin that is stopping.

For example, the `stop` function in the browser gets invoked as part of the `window.onbeforeunload` event, which means you can't necessarily execute asynchronous code here in a reliable way. For that reason, `core` likely wouldn't provide any asynchronous functions to plugin `stop` functions in the browser.

### Integrating with other plugins

Plugins can expose public interfaces for other plugins to consume. Like `core`, those interfaces are bound to `start` and/or `stop`.

Anything returned from `start` or `stop` will act as the interface, and while not a technical requirement, all Elastic plugins should expose types for that interface as well.

**foobar plugin.ts:**

```ts
export type FoobarPluginStart = ReturnType<Plugin['start']>;
export type FoobarPluginStop = ReturnType<Plugin['stop']>;

export class Plugin {
  public start() {
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

With that specified in the plugin manifest, the appropriate interfaces are then available via the second argument of `start` and/or `stop`:

**demo plugin.ts:**

```ts
import { PluginName, PluginStart, PluginStop } from '../../../core/server';
import { FoobarPluginStart, FoobarPluginStop } from '../../foobar/server';

interface DemoStartDependencies {
  foobar: FoobarPluginStart
}

interface DemoStopDependencies {
  foobar: FoobarPluginStop
}

export class Plugin {
  public start(core: PluginStart, dependencies: DemoStartDependencies) {
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

While not exactly the same, legacy plugin `init` functions behave similarly today as new platform `start` functions. There is no corresponding legacy concept of `stop`, however.

Despite their similarities, server-side plugins pose a formidable challenge: legacy core and plugin functionality is retrieved from either the hapi.js `server` or `request` god objects. Worse, these objects are often passed deeply throughout entire plugins, which directly couples business logic with hapi. And the worst of it all is, these objects are mutable at any time.

The key challenge to overcome with legacy server-side plugins will decoupling from hapi.

#### Challenges in the browser

The legacy plugin system in the browser is fundamentally incompatible with the new platform. There is no client-side plugin definition. There are no services that get passed to plugins at runtime. There really isn't even a concrete notion of "core".

When a legacy browser plugin needs to access functionality from another plugin, say to register a UI section to render within another plugin, it imports a stateful (global singleton) JavaScript module and performs some sort of state mutation. Sometimes this module exists inside the plugin itself, and it gets imported via the `plugin/` webpack alias. Sometimes this module exists outside the context of plugins entirely and gets imported via the `ui/` webpack alias. Neither of these concepts exist in the new platform.

Legacy browser plugins rely on the feature known as `uiExports/`, which integrates directly with our build system to ensure that plugin code is bundled together in such a way to enable that global singleton module state. There is no corresponding feature in the new platform, and in fact we intend down the line to build new platform plugins as immutable bundles that can not share state in this way.

The key challenge to overcome with legacy browser-side plugins will be converting all imports from `plugin/`, `ui/`, `uiExports`, and relative imports from other plugins into a set of services that originate at runtime during plugin initialization and get passed around throughout the business logic of the plugin as function arguments.

### Plan of action

In order to move a legacy plugin to the new plugin system, the challenges on the server and in the browser must be addressed. Fortunately, **the hardest problems can be solved in legacy plugins today** without consuming the new platform at all.

At a high level, the bulk of the migration work can be broken down into two phases.

First, refactor the plugin's architecture to isolate the legacy behaviors mentioned in the "Challenges to overcome with legacy plugins" section above. In practice, this involves moving all of the legacy imports and hapi god object references out of the business logic of your plugin and into a legacy _shim_.

Second, update the consuming code of core services within the plugin to that of the new platform. This can be done in the legacy world, though it is dependent on the relevant services actually existing.

Once those two things are done, the effort involved in actually updating your plugin to execute in the new plugin system is tiny and non-disruptive.

Before you do any of that, there are two other things that will make all steps of this process a great deal easier and less risky: switch to TypeScript, and remove your dependencies on angular.

#### TypeScript

The new platform does not _require_ plugins to be built with TypeScript, but all subsequent steps of this plan of action are more straightforward and carry a great deal less risk if the code is already converted to TypeScript.

TypeScript is a superset of JavaScript, so if your goal is the least possible effort, you can move to TypeScript with very few code changes mostly by adding `any` types all over the place. This isn't really any better than regular JavaScript, but simply having your code to `.ts` files means you can at least take advantage of the types that are exported from core and other plugins. This bare minimum approach won't help you much for the architectural shifts, but it could be a great help to you in reliably switching over to new platform services.

### De-angular

Angular is not a thing in the new platform. Hopefully your plugin began moving away from angular long ago, but if not, you're in a tight spot.

If your plugin is registering some sort of global behavior that technically crosses application boundaries, then you have no choice but to get rid of angular. In this case, you're probably best off dealing with this before proceeding with the rest of action plan.

If your plugin is using angular only in the context of its own application, then removing angular is likely not a definitive requirement for moving to the new platform. In this case, you will need to refactor your plugin to initialize an entirely standalone angular module that serves your application. You will need to create custom wrappers for any of the angular services you previously relied on (including those through `Private()`) inside your own plugin.

At this poing, keeping angular around is not the recommended approach. If you feel you must do it, then talk to the platform team directly and we can help you craft a plan.

We recommend that _all_ plugins treat moving away from angular as a top-most priority if they haven't done so already.
