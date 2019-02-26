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
* Frequently asked questions
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
import { PluginInitializerContext, CoreStart, PluginStop } from '../../../core/public';

export class Plugin {
  constructor(initializerContext: PluginInitializerContext) {
  }

  public start(core: CoreStart) {
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
import { PluginInitializerContext, CoreStart, PluginStop } from '../../../core/server';

export class Plugin {
  constructor(initializerContext: PluginInitializerContext) {
  }

  public start(core: CoreStart) {
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
import { CoreStart } from '../../../core/public';

export class Plugin {
  public start(core: CoreStart) {
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
import { CoreStart, PluginStop } from '../../../core/server';
import { FoobarPluginStart, FoobarPluginStop } from '../../foobar/server';

interface DemoStartDependencies {
  foobar: FoobarPluginStart
}

interface DemoStopDependencies {
  foobar: FoobarPluginStop
}

export class Plugin {
  public start(core: CoreStart, dependencies: DemoStartDependencies) {
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
import { CoreStart } from '../../core/server';
import { FooPluginStart } from '../foo/server';

interface DemoStartDependencies {
  foo: FooPluginStart
}

export type DemoPluginStart = ReturnType<Plugin['start']>;

export class Plugin {
  public start(core: CoreStart, dependencies: DemoStartDependencies) {
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

The new plugin definition uses `start` instead of `init`, and rather than getting the hapi server object as its only argument, it gets two arguments: the core services and a dependency on another plugin.

```ts
// before
init(server) {
  // ...
}

//after
public start(core: CoreStart, dependencies: DemoStartDependencies) {
  // ...
}
```

##### Accessing core services

Rather than accessing "core" functions like HTTP routing directly on a hapi server object, the new plugin accesses core functionality through the top level services it exposes in the first argument to `start`. In the case of HTTP routing, it uses `core.http`.

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

New plugins return the contract (if any) that they wish to make available to downstream plugins. This ensures the entirety of a plugin's start contract is available upon completion of its own `start` function. It also makes it much easier to provide type definitions for plugin contracts.

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

In server-side code of legacy plugins, you once again use the hapi `server` object to access functionality that was exposed by other plugins. In new plugins, you access the exposed functionality in a similar way but on the second argument to `start` that is dedicated only to injecting plugin capabilities.

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
// import CoreStart type from core server
import { CoreStart } from '../../core/server';

// import FooPluginStart type from plugin foo
import { FooPluginStart } from '../foo/server';

// export DemoPluginStart type for downstream plugins, based on return value of start()
export type DemoPluginStart = ReturnType<Plugin['start']>;
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
import { CoreStart } from '../../core/public';
import { FooPluginStart } from '../foo/public';

interface DemoStartDependencies {
  foo: FooPluginStart
}

export class Plugin {
  public start(core: CoreStart, dependencies: DemoStartDependencies) {
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

new Plugin().start(core, dependencies);
```

The `shim_plugin.js` file is take on the role of the plugin service in the new platform. It wires up the plugin definition with the dependencies that plugin has on core (i.e. `chrome`) and other plugins (i.e. `foo`). All of the webpack alias imports needed by this plugin have been moved into the shim, and the `plugin.js` code is pristine.

##### Creating an extension

Legacy plugins today extend applications by adding functionality through a registry in a uiExport. In the previous example, you saw how to shim this relationship from the extending side into the new plugin definition. Now, let's see how to shim the relavant uiExport registry from the side of the plugin that "owns" it.

We need to update the registry to expose access to state as an observable. In most cases, this will only affect the implementation details of the owning plugin. This is how state should be shared between plugins in the new platform, but more importantly it is necessary now to move away from the uiExports extension while the order of legacy plugin execution is not determined by a dependency graph.

In order to support dependent legacy plugins that have not yet been updated, we continue to initiate the uiExport in the app entry file. Once all downstream plugins have been updated to access the registry in a shimmed plugin definition, the `uiExports/` import statement from the app entry file can be removed.

```ts
// foo/public/plugin.ts
import { ReplaySubject } from 'rxjs';

export type FooPluginStart = ReturnType<Plugin['start']>;

export type FooFn = () => void;

export class Plugin {
  public constructor() {
    this.fooRegistry = [];
    this.foos$ = new ReplaySubject(1);
  }

  public start() {
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
const start = plugin.start();

require('ui/registry/foo').__temporaryShim__(start);


// ui/public/registry/foo.ts
import { FooPluginStart, FooFn } from '../../../core_plugins/foo/public/plugin';

// legacy plugin order is not guaranteed, so we store a buffer of registry
// calls and then empty them out when the owning plugin shims this module with
// proper state
let temporaryRegistry = [];
let start;
export function __temporaryShim__(fooStart: FooPluginStart) {
  if (start) {
    throw new Error('Foo registry already shimmed');
  }
  start = fooStart;
  temporaryRegistry.forEach(fn => start.registerFoo(fn));
  temporaryRegistry = undefined;
}

export const FooRegistryProvider = {
  register(fn: FooFn) {
    if (start) {
      start.registerFoo(fn);
    } else {
      temporaryRegistry.push(fn);
    }
  },
  getAll() {
    if (start) {
      return start.foos$;
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
  start(core) {
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
import { I18nContext } from 'ui/i18n';
import { Plugin } from '../plugin';

const core = {
  i18n: {
    I18nContext
  }
};

new Plugin().start(core);


// demo/public/index.js
import { core } from 'ui/core';
import { uiModules } from 'ui/modules'; // eslint-disable-line no-unused-vars
import 'ui/autoload/styles';
import 'ui/autoload/all';

import template from './templates/index.html';
chrome.setRootTemplate(template);
const domElement = document.getElementById('react-apm-root');

core.applications.mountApp('demo', domElement);
```




# Random temporary idea thrashing below

* Plugin without app
* Plugin with angular app
* Plugin with react app

Client-side legacy plugin code is where things get weird, but the approach is largely the same - in the public entry file of the plugin, we separate the legacy integrations with the new plugin definition using a temporary "shim".

As before, let's start with an example legacy client-side plugin. This example integrates with core, consumes functionality from another plugin, and exposes functionality for other plugins to consume via `uiExports`. This would be the rough shape of the code that would originate in the entry file, which would be either `index.ts` or `<pluginname>.ts`:

```js
// visualize/hacks/plugin.js
// example init of updated plugin that preserves legacy API and introduces new one
import { startContracts } from 'ui/legacy/plugins';
import { Plugin } from '../plugin';

const core = {};
const dependencies = {}

const plugin = new Plugin();
const start = plugin.start(core, dependencies);
startContracts.set('visualize', start);

require('ui/registry/vis_types').__shimYourStuff__(plugin.visTypes$);
require('uiExports/visTypes');


// visualize/plugin.js
// example of upgraded plugin definition
export class Plugin {
  constructor() {
    this.visTypes$ = new ReplaySubject(1);
  }

  start(core, dependencies) {
    core.applications.registerApp('visualize', (domElement) => {
      this.legacyHackApp();

      import('../application').then(({ bootstrapApp }) => {
        const app = bootstrapApp(domElement);
      });

      return app.start();
    });

    return {
      registerVisType(type) {
        this.visTypes$.push(type);
      }
    };
  }
}

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

routes.enable();

routes
  .otherwise({
    redirectTo: `/${chrome.getInjected('kbnDefaultAppId', 'discover')}`
  });

uiModules.get('kibana').run(showAppRedirectNotification);





// tag_cloud/hacks/plugin.js
// example init of updated plugin that consumes new interface
import { startContracts } from 'ui/legacy/plugins';
import { Plugin } from '../plugin';

const core = {};
const dependencies = {
  ...startContracts
}

const plugin = new Plugin();
plugin.start(core, dependencies);











// visualize/public/index.js
import { coreStart } from 'ui/core';
import { foo } from 'ui/plugins';

import { visualize } from 'ui/legacy_plugins';

import { getBar } from 'plugins/bar';

const core = {
  chrome: coreStart.chrome
};

const dependencies = {
  bar: {
    getBar
  }
};

export class Plugin {
  constructor() {
    this.visTypes$ = new ReplaySubject(1);
  }
  start(core, dependencies) {
    //require('ui/registry/vis_types').__shimYourStuff__(this.visTypes$);
    require('uiExports/visTypes');

    return {
      visTypes$ = this.visTypes$.asObservable();
      myVis() {

      }
    }
  }
}

export startContract = new Plugin();

//const start = new Plugin().start(core);

export function myVis() {
  return start.myVis();
}




// my_custom_visualization/index.js
{
  uiExports: {
    vis_type: 'plugins/my_custom_visulaization/some_file'
  }
}
// my_custom_visualization/public/some_file.js
import { VisTypesProvider } from 'ui/registry/vis_types';
VisTypesProvider.register(($http) => {
  return { type: 'mycustomvis' };
});
```

Expressed in the shape of a new plugin:

```ts
import { CoreStart } from '../../core/public';
import { FooPluginStart } from '../foo/public';

interface DemoStartDependencies {
  foo: FooPluginStart
}

export type DemoPluginStart = ReturnType<Plugin['start']>;

export class Plugin {
  public start(core: CoreStart, dependencies: DemoStartDependencies) {
    core.router.when('/demo-foo', async (request) => {

    });

    return {
      registerExtension() {

      }
    };
  }
}
```


##### Rule of thumb for client-side changes

Outside of the temporary shim, does your plugin code rely directly on code imported from webpack aliases (e.g. `import from 'plugins/...'` or `import from 'ui/...'`)? If not, you're probably good to go.
