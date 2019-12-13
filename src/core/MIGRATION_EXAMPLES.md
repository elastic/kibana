# Migration Examples

This document is a list of examples of how to migrate plugin code from legacy
APIs to their New Platform equivalents.

- [Migration Examples](#migration-examples)
  - [Configuration](#configuration)
    - [Declaring config schema](#declaring-config-schema)
    - [Using New Platform config from a Legacy plugin](#using-new-platform-config-from-a-legacy-plugin)
      - [Create a New Platform plugin](#create-a-new-platform-plugin)
  - [HTTP Routes](#http-routes)
    - [1. Legacy route registration](#1-legacy-route-registration)
    - [2. New Platform shim using legacy router](#2-new-platform-shim-using-legacy-router)
    - [3. New Platform shim using New Platform router](#3-new-platform-shim-using-new-platform-router)
      - [4. New Platform plugin](#4-new-platform-plugin)
    - [Accessing Services](#accessing-services)
  - [Chrome](#chrome)
  
## Configuration

### Declaring config schema

Declaring the schema of your configuration fields is similar to the Legacy Platform but uses the `@kbn/config-schema` package instead of Joi. This package has full TypeScript support, but may be missing some features you need. Let the Platform team know by opening an issue and we'll add what you're missing.

```ts
// Legacy config schema
import Joi from 'joi';

new kibana.Plugin({
  config() {
    return Joi.object({
      enabled: Joi.boolean().default(true),
      defaultAppId: Joi.string().default('home'),
      index: Joi.string().default('.kibana'),
      disableWelcomeScreen: Joi.boolean().default(false),
      autocompleteTerminateAfter: Joi.number().integer().min(1).default(100000),
    })
  }
});

// New Platform equivalent
import { schema, TypeOf } from '@kbn/config-schema';

export const config = {
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    defaultAppId: schema.string({ defaultValue: true }),
    index: schema.string({ defaultValue: '.kibana' }),
    disableWelcomeScreen: schema.boolean({ defaultValue: false }),
    autocompleteTerminateAfter: schema.duration({ min: 1, defaultValue: 100000 }),
  })
};

// @kbn/config-schema is written in TypeScript, so you can use your schema
// definition to create a type to use in your plugin code.
export type MyPluginConfig = TypeOf<typeof config.schema>;
```

### Using New Platform config in a new plugin

After setting the config schema for your plugin, you might want to reach the configuration in the plugin.
It is provided as part of the [PluginInitializerContext](../../docs/development/core/server/kibana-plugin-server.plugininitializercontext.md)
in the *constructor* of the plugin:

```ts
// myPlugin/(public|server)/index.ts

import { PluginInitializerContext } from 'kibana/server';
import { MyPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new MyPlugin(initializerContext);
}
```

```ts
// myPlugin/(public|server)/plugin.ts

import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { CoreSetup, Logger, Plugin, PluginInitializerContext, PluginName } from 'kibana/server';
import { MyPlugin } from './plugin';

export class MyPlugin implements Plugin {
  private readonly config$: Observable<MyPluginConfig>;
  private readonly log: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.log = initializerContext.logger.get();
    this.config$ = initializerContext.config.create();
  }

  public async setup(core: CoreSetup, deps: Record<PluginName, unknown>) {
    const isEnabled = await this.config$.pipe(first()).toPromise();
    ...
  }
  ...
}
}
```

Additionally, some plugins need to read other plugins' config to act accordingly (like timing out a request, matching ElasticSearch's timeout). For those use cases, the plugin can rely on the *globalConfig* and *env* properties in the context:

```ts
export class MyPlugin implements Plugin {
...
  public async setup(core: CoreSetup, deps: Record<PluginName, unknown>) {
    const { mode: { dev }, packageInfo: { version } } = this.initializerContext.env;
    const { elasticsearch: { shardTimeout }, path: { data } } = await this.initializerContext.config.legacy.globalConfig$
      .pipe(first()).toPromise();
    ...
  }
```

### Using New Platform config from a Legacy plugin

During the migration process, you'll want to migrate your schema to the new
format. However, legacy plugins cannot directly get access to New Platform's
config service due to the way that config is tied to the `kibana.json` file
(which does not exist for legacy plugins).

There is a workaround though:

- Create a New Platform plugin that contains your plugin's config schema in the new format
- Expose the config from the New Platform plugin in its setup contract
- Read the config from the setup contract in your legacy plugin

#### Create a New Platform plugin

For example, if wanted to move the legacy `timelion` plugin's configuration to
the New Platform, we could create a NP plugin with the same name in
`src/plugins/timelion` with the following files:

```json5
// src/plugins/timelion/kibana.json
{
  "id": "timelion",
  "server": true
}
```

```ts
// src/plugins/timelion/server/index.ts
import { schema, TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext } from 'src/core/server';
import { TimelionPlugin } from './plugin';

export const config = {
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
  });
}

export const plugin = (initContext: PluginInitializerContext) => new TimelionPlugin(initContext);

export type TimelionConfig = TypeOf<typeof config.schema>;
export { TimelionSetup } from './plugin';
```

```ts
// src/plugins/timelion/server/plugin.ts
import { PluginInitializerContext, Plugin, CoreSetup } from '../../core/server';
import { TimelionConfig } from '.';

export class TimelionPlugin implements Plugin<TimelionSetup> {
  constructor(private readonly initContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    return {
      __legacy: {
        config$: this.initContext.config.create<TimelionConfig>(),
      },
    };
  }

  public start() {}
  public stop() {}
}

export interface TimelionSetup {
  /** @deprecated */
  __legacy: {
    config$: Observable<TimelionConfig>;
  };
}
```

With the New Platform plugin in place, you can then read this `config$`
Observable from your legacy plugin:

```ts
import { take } from 'rxjs/operators';

new kibana.Plugin({
  async init(server) {
    const { config$ } = server.newPlatform.setup.plugins.timelion;
    const currentConfig = await config$.pipe(take(1)).toPromise();
  }
});
```

## HTTP Routes

In the legacy platform, plugins have direct access to the Hapi `server` object
which gives full access to all of Hapi's API. In the New Platform, plugins have
access to the
[HttpServiceSetup](/docs/development/core/server/kibana-plugin-server.httpservicesetup.md)
interface, which is exposed via the
[CoreSetup](/docs/development/core/server/kibana-plugin-server.coresetup.md)
object injected into the `setup` method of server-side plugins.

This interface has a different API with slightly different behaviors.

- All input (body, query parameters, and URL parameters) must be validated using
  the `@kbn/config-schema` package. If no validation schema is provided, these
  values will be empty objects.
- All exceptions thrown by handlers result in 500 errors. If you need a specific
  HTTP error code, catch any exceptions in your handler and construct the
  appropriate response using the provided response factory. While you can
  continue using the `boom` module internally in your plugin, the framework does
  not have native support for converting Boom exceptions into HTTP responses.

Because of the incompatibility between the legacy and New Platform HTTP Route
API's it might be helpful to break up your migration work into several stages.

### 1. Legacy route registration

```ts
// legacy/plugins/myplugin/index.ts
import Joi from 'joi';

new kibana.Plugin({
  init(server) {
    server.route({
      path: '/api/demoplugin/search',
      method: 'POST',
      options: {
        validate: {
          payload: Joi.object({
            field1: Joi.string().required(),
          }),
        }
      },
      handler(req, h) {
        return { message: `Received field1: ${req.payload.field1}` };
      }
    });
  }
});
```

### 2. New Platform shim using legacy router

Create a New Platform shim and inject the legacy `server.route` into your
plugin's setup function.

```ts
// legacy/plugins/demoplugin/index.ts
import { Plugin, LegacySetup } from './server/plugin';
export default (kibana) => {
  return new kibana.Plugin({
    id: 'demo_plugin',

    init(server) {
      // core shim
      const coreSetup: server.newPlatform.setup.core;
      const pluginSetup = {};
      const legacySetup: LegacySetup = {
        route: server.route
      };

      new Plugin().setup(coreSetup, pluginSetup, legacySetup);
    }
  }
}
```

```ts
// legacy/plugins/demoplugin/server/plugin.ts
import { CoreSetup } from 'src/core/server';
import { Legacy } from 'kibana';

export interface LegacySetup {
  route: Legacy.Server['route'];
};

export interface DemoPluginsSetup {};

export class Plugin {
  public setup(core: CoreSetup, plugins: DemoPluginsSetup, __LEGACY: LegacySetup) {
    __LEGACY.route({
      path: '/api/demoplugin/search',
      method: 'POST',
      options: {
        validate: {
          payload: Joi.object({
            field1: Joi.string().required(),
          }),
        }
      },
      async handler(req) {
        return { message: `Received field1: ${req.payload.field1}` };
      },
    });
  }
}
```

### 3. New Platform shim using New Platform router

We now switch the shim to use the real New Platform HTTP API's in `coreSetup`
instead of relying on the legacy `server.route`. Since our plugin is now using
the New Platform API's we are guaranteed that our HTTP route handling is 100%
compatible with the New Platform. As a result, we will also have to adapt our
route registration accordingly.

```ts
// legacy/plugins/demoplugin/index.ts
import { Plugin } from './server/plugin';
export default (kibana) => {
  return new kibana.Plugin({
    id: 'demo_plugin',

    init(server) {
      // core shim
      const coreSetup = server.newPlatform.setup.core;
      const pluginSetup = {};

      new Plugin().setup(coreSetup, pluginSetup);
    }
  }
}
```

```ts
// legacy/plugins/demoplugin/server/plugin.ts
import { schema } from '@kbn/config-schema';
import { CoreSetup } from 'src/core/server';

export interface DemoPluginsSetup {};

class Plugin {
  public setup(core: CoreSetup, pluginSetup: DemoPluginSetup) {
    const router = core.http.createRouter();
    router.post(
      {
        path: '/api/demoplugin/search',
        validate: {
          body: schema.object({
            field1: schema.string(),
          }),
        }
      },
      (context, req, res) => {
        return res.ok({
          body: {
            message: `Received field1: ${req.body.field1}`
          }
        });
      }
    )
  }
}
```

If your plugin still relies on throwing Boom errors from routes, you can use the `router.handleLegacyErrors`
as a temporary solution until error migration is complete:

```ts
// legacy/plugins/demoplugin/server/plugin.ts
import { schema } from '@kbn/config-schema';
import { CoreSetup } from 'src/core/server';

export interface DemoPluginsSetup {};

class Plugin {
  public setup(core: CoreSetup, pluginSetup: DemoPluginSetup) {
    const router = core.http.createRouter();
    router.post(
      {
        path: '/api/demoplugin/search',
        validate: {
          body: schema.object({
            field1: schema.string(),
          }),
        }
      },
      router.wrapErrors((context, req, res) => {
        throw Boom.notFound('not there'); // will be converted into proper New Platform error
      })
    )
  }
}
```

#### 4. New Platform plugin

As the final step we delete the shim and move all our code into a New Platform
plugin. Since we were already consuming the New Platform API's no code changes
are necessary inside `plugin.ts`.

```ts
// Move legacy/plugins/demoplugin/server/plugin.ts -> plugins/demoplugin/server/plugin.ts
```

### Accessing Services

Services in the Legacy Platform were typically available via methods on either
`server.plugins.*`, `server.*`, or `req.*`. In the New Platform, all services
are available via the `context` argument to the route handler. The type of this
argument is the
[RequestHandlerContext](/docs/development/core/server/kibana-plugin-server.requesthandlercontext.md).
The APIs available here will include all Core services and any services
registered by plugins this plugin depends on.

```ts
new kibana.Plugin({
  init(server) {
    const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');

    server.route({
      path: '/api/my-plugin/my-route',
      method: 'POST',
      async handler(req, h) {
        const results = await callWithRequest(req, 'search', query);
        return { results };
      }
    });
  }
});

class Plugin {
  public setup(core) {
    const router = core.http.createRouter();
    router.post(
      {
        path: '/api/my-plugin/my-route',
      },
      async (context, req, res) => {
        const results = await context.elasticsearch.dataClient.callAsCurrentUser('search', query);
        return res.ok({
          body: { results }
        });
      }
    )
  }
}
```

## Chrome

In the Legacy Platform, the `ui/chrome` import contained APIs for a very wide
range of features. In the New Platform, some of these APIs have changed or moved
elsewhere.

| Legacy Platform                                       | New Platform                                                                                                                        | Notes                                                                                                                                                                            |
|-------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `chrome.addBasePath`                                  | [`core.http.basePath.prepend`](/docs/development/core/public/kibana-plugin-public.httpservicebase.basepath.md)                      |                                                                                                                                                                                  |
| `chrome.breadcrumbs.set`                              | [`core.chrome.setBreadcrumbs`](/docs/development/core/public/kibana-plugin-public.chromestart.setbreadcrumbs.md)                    |                                                                                                                                                                                  |
| `chrome.getUiSettingsClient`                          | [`core.uiSettings`](/docs/development/core/public/kibana-plugin-public.uisettingsclient.md)                                         |                                                                                                                                                                                  |
| `chrome.helpExtension.set`                            | [`core.chrome.setHelpExtension`](/docs/development/core/public/kibana-plugin-public.chromestart.sethelpextension.md)                |                                                                                                                                                                                  |
| `chrome.setVisible`                                   | [`core.chrome.setIsVisible`](/docs/development/core/public/kibana-plugin-public.chromestart.setisvisible.md)                        |                                                                                                                                                                                  |
| `chrome.getInjected`                                  | [`core.injectedMetadata.getInjected`](/docs/development/core/public/kibana-plugin-public.coresetup.injectedmetadata.md) (temporary) | A temporary API is available to read injected vars provided by legacy plugins. This will be removed after [#41990](https://github.com/elastic/kibana/issues/41990) is completed. |
| `chrome.setRootTemplate` / `chrome.setRootController` | --                                                                                                                                  | Use application mounting via `core.application.register` (not currently avaiable to legacy plugins).                                                                             |

In most cases, the most convenient way to access these APIs will be via the
[AppMountContext](/docs/development/core/public/kibana-plugin-public.appmountcontext.md)
object passed to your application when your app is mounted on the page.
