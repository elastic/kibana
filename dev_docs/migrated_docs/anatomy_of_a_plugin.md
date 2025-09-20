---
id: kibDevAnatomyOfAPlugin
slug: /kibana-dev-docs/key-concepts/anatomy-of-a-plugin
title: Anatomy of a plugin
description: Anatomy of a Kibana plugin.
date: 2025-08-21
tags: ['kibana', 'onboarding', 'dev']
---

## Overview

This guide covers the structure and components of internal Kibana plugins. For 3rd-party plugin development, see the [external plugin development guide](https://www.elastic.co/docs/extend/kibana/external-plugin-development).

**Pre-reading**: [Plugins, packages, and the platform](/kibana-dev-docs/key-concepts/platform-intro)

Plugins are JavaScript classes that extend Kibana's functionality. They can run on the browser, server, or both. Whether client-side or server-side, plugins follow the same architecture and interact with core services and other plugins consistently.

## Plugin structure

Here's the typical file structure for a plugin with both client and server code:

```
plugins/
  demo
    kibana.json
    tsconfig.json
    public
      index.ts
      plugin.ts
    server
      index.ts
      plugin.ts
    common
      index.ts
    jest.config.js
```

### kibana.json

`kibana.json` is a static manifest file that identifies the plugin and specifies if it has server-side code, browser-side code, or both:

```jsonc
{
  "type": "plugin",
  "id": "@kbn/example-plugin",
  "owner": "@elastic/kibana-core",
  "description": "A description about this plugin!",
  "plugin": {
    "id": "examplePluginId",
    "server": true,
    "browser": true,
    "requiredPlugins": [
      "developerExamples"
    ],
   "optionalPlugins": ["alerting"],
   "requiredBundles": ["anotherPlugin"],
   "group": "chat",
   "visibility": "shared"
  }
}
```

**Required fields:**

- `type`: Must be "plugin"
- `id`: Unique package ID starting with `@kbn/` (format: `@scope/name`)
- `owner`: GitHub team reference (e.g., `"@elastic/kibana-core"`)
- `description`: Brief description for other developers
- `plugin.id`: Unique plugin identifier in snakeCase
- `group`: Category like "search", "security", "observability", "platform", or "chat"

**Optional fields:**

- `plugin.server`: Set to `true` if plugin has server-side code
- `plugin.browser`: Set to `true` if plugin has client-side code
- `plugin.requiredPlugins`: Array of plugin IDs this plugin depends on
- `plugin.optionalPlugins`: Array of optional plugin dependencies
- `plugin.requiredBundles`: Bundle dependencies (build optimizer will validate)
- `visibility`: Either "private" (same group access) or "shared" (any group access)

> [!NOTE]
> You don't need to declare a dependency on a plugin if you only wish to access its types.

### tsconfig.json

For TypeScript development (recommended), create a `tsconfig.json` file. Here's an example for a plugin in the `examples` directory:

```jsonc
{
  "extends": "../../tsconfig.json", // Extends kibana/tsconfig.json
  "compilerOptions": {
    "outDir": "target/types"
  },
  "include": [
    "index.ts",
    "../../typings/**/*",
    // The following paths are optional, based on whether you have common code,
    // or are building a client-side-only or server-side-only plugin.
    "common/**/*.ts",
    "public/**/*.ts",
    "public/**/*.tsx",
    "server/**/*.ts"
  ],
  "exclude": [
    "target/**/*"
  ],
  // If you import other plugins:
  "kbn_references": [
      "@kbn/core",
      "@kbn/developer-examples-plugin"
      // NOTE:
      // Previously, references were specified using explicit paths to other plugins' tsconfig.json files, like:
      // "references": [{ "path": "../../src/core/tsconfig.json" }]
      //
      // Now, Kibana uses simplified package aliases under "kbn_references" to refer to these dependencies,
      // e.g., "@kbn/core" or "@kbn/developer-examples-plugin".
      //
      // This new approach makes references clearer, reduces path errors, and aligns with Kibana's package structure.
    ]
}
```

### public/index.ts

This is the client-side entry point. Everything exported becomes part of the plugin's [public API](/kibana-dev-docs/key-concepts/platform-intro#public-plugin-api).

If you're only exporting static utilities, consider using a package instead. Otherwise, export a `plugin` function that returns a plugin class instance:

```ts
import type { PluginInitializerContext } from '@kbn/core/public';
import { DemoPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new DemoPlugin(initializerContext);
}
```

> [!NOTE]
> **Best practices for every top level index.ts file**
> 
> 1. When possible, use
> 
> ```
> export type { AType } from '...'`
> ```
> 
> instead of
> 
> ```
> export { AType } from '...'`.
> ```
> 
> Using the non-`type` variation will increase the bundle size unnecessarily and may unwillingly provide access to the implementation of `AType` class.
> 
> 2. Don't use `export *` in these top level index.ts files

### public/plugin.ts

This contains your client-side plugin class. While it could be defined in the entry point file, we use a separate file for consistency:

```ts
import type { Plugin, PluginInitializerContext, CoreSetup, CoreStart } from '@kbn/core/server';

export class DemoPlugin implements Plugin {
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

### server/index.ts

Server-side entry point:

```ts
import type { PluginInitializerContext } from '@kbn/core/server';

export async function plugin(initializerContext: PluginInitializerContext) {
  const { DemoPlugin } = await import('./plugin');
  return new DemoPlugin(initializerContext);
}
```

### server/plugin.ts

Server-side plugin class with the same structure as the client-side version:

```ts
import type { Plugin, PluginInitializerContext, CoreSetup, CoreStart } from '@kbn/core/server';

export class DemoPlugin implements Plugin {
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

Kibana doesn't impose restrictions on plugin architecture, but consider how your plugin integrates with core APIs and other plugins.

### common/index.ts

Entry point for code shared between client and server.

### jest.config.js

For unit tests (recommended), add this Jest configuration file:

```js
module.exports = {
  // Default Jest settings, defined in kbn-test package
  preset: '@kbn/test',
  // The root of the directory containing package.json
  rootDir: '../../..',
  // The directory which Jest should use to search for files in
  roots: ['<rootDir>/src/plugins/demo'],
  // The directory where Jest should output plugin coverage details, e.g. html report
  coverageDirectory: '<rootDir>/target/kibana-coverage/jest/src/plugins/demo',
  // A list of reporter names that Jest uses when writing coverage reports, default: ["json"]
  // "text" is available in console and is good for quick check
  // "html" helps to dig into specific files and fix coverage
  coverageReporters: ['text', 'html'],
  // An array of regexp pattern strings that matched files to include/exclude for code coverage
  collectCoverageFrom: ['<rootDir>/src/plugins/demo/{common,public,server}/**/*.{ts,tsx}'],
};
```

## Plugin interactions

### Using core services

Core services are passed as the first argument to plugin lifecycle functions. For example, to create HTTP routes:

```ts
import type { CoreSetup } from '@kbn/core/server';

export class DemoPlugin {
  public setup(core: CoreSetup) {
    const router = core.http.createRouter();
    // handler is called when '/path' resource is requested with `GET` method
    router.get({ path: '/path', validate: false }, (context, req, res) =>
      res.ok({ content: 'ok' })
    );
  }
}
```

### Using other plugins

To use another plugin's API, declare it as a dependency in your `kibana.json`:

**Example plugin with public interfaces (foobar/plugin.ts):**

```ts
import type { Plugin } from '@kbn/core/server';
// [1]
export interface FoobarPluginSetup {
  getFoo(): string;
}

// [1]
export interface FoobarPluginStart {
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

[1] We highly encourage plugin authors to explicitly declare public interfaces for their plugins.

**Consuming plugin manifest (demo/kibana.json):**

```
{
  "plugin": {
    "id": "demo",
    "requiredPlugins": ["foobar"],
    "server": true,
    "browser": true
  }
}
```

**Using the dependency in your plugin:**

```ts
import type { CoreSetup, CoreStart } from '@kbn/core/server';
import type { FoobarPluginSetup, FoobarPluginStart } from '../../foobar/server';

// [1]
interface DemoSetupPlugins {
  foobar: FoobarPluginSetup;
}

interface DemoStartPlugins {
  foobar: FoobarPluginStart;
}

export class DemoPlugin {
  // [2]
  public setup(core: CoreSetup, plugins: DemoSetupPlugins) {
    const { foobar } = plugins;
    foobar.getFoo(); // 'foo'
    foobar.getBar(); // throws because getBar does not exist
  }

  //[3]
  public start(core: CoreStart, plugins: DemoStartPlugins) {
    const { foobar } = plugins;
    foobar.getFoo(); // throws because getFoo does not exist
    foobar.getBar(); // 'bar'
  }

  public stop() {}
}
```

**Key points:**

[1] The interface for plugin's dependencies must be manually composed. You can do this by importing the appropriate type from the plugin and constructing an interface where the property name is the plugin's ID.

[2] These manually constructed types should then be used to specify the type of the second argument to the plugin.

[3] Notice that the type for the setup and start lifecycles are different. Plugin lifecycle functions can only access the APIs that are exposed during that lifecycle.