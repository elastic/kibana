# Migration Examples

This document is a list of examples of how to migrate plugin code from legacy
APIs to their New Platform equivalents.

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

### Route Registration

```ts
// Legacy route registration
import Joi from 'joi';

new kibana.Plugin({
  init(server) {
    server.route({
      path: '/api/my-plugin/my-route',
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


// New Platform equivalent
import { schema } from '@kbn/config-schema';

class Plugin {
  public setup(core) {
    const router = core.http.createRouter();
    router.post(
      {
        path: '/api/my-plugin/my-route',
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
