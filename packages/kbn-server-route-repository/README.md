# @kbn/server-route-repository

Utility functions for creating a typed server route repository, and a typed client, generating runtime validation and type validation from the same route definition.

## Overview

There are three main functions that make up this package:
1. `createServerRouteFactory`
2. `registerRoutes`
3. `createRepositoryClient`

`createServerRouteFactory` and `registerRoutes` are used in the server and `createRepositoryClient` in the browser (thus it is imported from `@kbn/server-route-repository-client`).

`createServerRouteFactory` returns a function that can be used to create routes for the repository, when calling it you can specify the resources that will be available to your route handler as well as which other options should be specified on your routes.

Once the routes have been created and put into a plain object (the "repository"), this repository can then be passed to `registerRoutes` which also accepts the dependencies to be injected into each route handler. `registerRoutes` handles the creation of the Core HTTP router, as well as the final registration of the routes with versioning and request validation.

By exporting the type of the repository from the server to the browser (make sure you use a `type` import), we can pass that as a generic argument to `createRepositoryClient` and get back a thin but strongly typed wrapper around the Core HTTP service, with auto completion for the available routes, type checking for the request parameters required by each specific route and response type inference. You can also add a generic type for which additional options the client should pass with each request.

## Basic example

In the server side, we'll start by creating the route factory, to make things easier it is recommended to keep this in its own file and export it.

> server/create_my_plugin_server_route.ts
```javascript
import { createServerRouteFactory } from '@kbn/server-route-repository';
import {
  DefaultRouteHandlerResources,
  DefaultRouteCreateOptions,
} from '@kbn/server-route-repository-utils';

export const createMyPluginServerRoute = createServerRouteFactory<
  DefaultRouteHandlerResources,
  DefaultRouteCreateOptions
>();
```

The two generic arguments are optional, this example shows a "default" setup which exposes what Core HTTP would normally provide (`request`, `context`, `response`) plus a logger.

Next, let's create a minimal route.

> server/my_route.ts
```javascript
import { createMyPluginServerRoute } from './create_my_plugin_server_route';

export const myRoute = createMyPluginServerRoute({
    endpoint: 'GET /internal/my_plugin/route',
    handler: async (resources) => {
        const { request, context, response, logger } = resources;
        return response.ok({
            body: 'Hello, my route!',
        });
    },
});
```

After this we can add the route to a "repository", which is just a plain object, and call `registerRoutes`.

> server/plugin.ts

```javascript
import { registerRoutes } from '@kbn/server-route-repository';

import { myRoute } from './my_route';

const repository = {
    ...myRoute,
};

export type MyPluginRouteRepository = typeof repository;

class MyPlugin implements Plugin {
    public setup(core: CoreSetup) {
        registerRoutes({
            core,
            logger,
            repository,
            dependencies: {},
        });
    }
}
```

Since this example doesn't use any dependencies, the generic argument for `registerRoutes` is optional and we pass an empty object.  
We also export the type of the repository, we'll need this for the client which is next!

The client can be created either in `setup` or `start`.

> browser/plugin.ts
```javascript
import { createRepositoryClient, isHttpFetchError, DefaultClientOptions } from '@kbn/server-route-repository-client';
import type { MyPluginRouteRepository } from '../server/plugin';

export type MyPluginRepositoryClient = 
  ReturnType<typeof createRepositoryClient<MyPluginRouteRepository, DefaultClientOptions>>;

class MyPlugin implements Plugin {
    public setup(core: CoreSetup) {
        const myPluginRepositoryClient =
          createRepositoryClient<MyPluginRouteRepository, DefaultClientOptions>(core);

        myPluginRepositoryClient
          .fetch('GET /internal/my_plugin/route')
          .then((response) => console.log(response))
          .catch((error) => {
            if (isHttpFetchError(error)) {
              console.log(error.message);
            }

            throw error;
          });
    }
}
```

This example prints 'Hello, my route!' and the type of the response is **inferred** to this.

We pass in the type of the repository that we (_type_) imported from the server. The second generic parameter for `createRepositoryClient` is optional.  
We also export the type of the client itself so we can use it to type the client as we pass it around.  

When using the client's `fetch` function, the first argument is the route to call and this is auto completed to only the available routes.
The second argument is optional in this case but allows you to send in any extra options. 

The client translates the endpoint and the options (including request parameters) to the right Core HTTP request.

## Request parameter validation

When creating your routes, you can provide either a `zod` schema or an `io-ts` codec to be used when validating incoming requests.

```javascript
import { z } from '@kbn/zod';

const myRoute = createMyPluginServerRoute({
  endpoint: 'POST /internal/my_plugin/route/{my_path_param}',
  params: z.object({
    path: z.object({
      my_path_param: z.string(),
    }),
    query: z.object({
      my_query_param: z.string(),
    }),
    body: z.object({
      my_body_param: z.string(),
    }),
  }),
  handler: async (resources) => {
    const { request, context, response, logger, params } = resources;

    const { path, query, body } = params;

    return response.ok({
      body: 'Hello, my route!',
    });
  },
});
```

The `params` object is added to the route resources.  
`path`, `query` and `body` are validated before your handler is called and the types are **inferred** inside of the handler.

When calling this endpoint, it will look like this:
```javascript
client('POST /internal/my_plugin/route/{my_path_param}', {
    params: {
        path: {
            my_path_param: 'some_path_value',
        },
        query: {
            my_query_param: 'some_query_value',
        },
        body: {
            my_body_param: 'some_body_value',
        },
    },
}).then(console.log);
```

Where the shape of `params` is typed to match the expected shape, meaning you don't need to manually use the codec when calling the route.

> When using `zod` you also opt into the Kibana platforms automatic OpenAPI specification generation tooling.  
> By adding `server.oas.enabled: true` to your `kibana.yml` and visiting `/api/oas?pluginId=yourPluginId` you can see the generated specification.

## Public routes

To define a public route, you need to change the endpoint path and add a version.

```javascript
const myRoute = createMyPluginServerRoute({
  endpoint: 'GET /api/my_plugin/route 2024-08-02',
  handler: async (resources) => {
    const { request, context, response, logger } = resources;
    return response.ok({
      body: 'Hello, my route!',
    });
  },
});
```

`registerRoutes` takes care of setting the `access` option correctly for you and using the right versioned router.

## Convenient return and throw

`registerRoutes` translate any returned or thrown non-Kibana response into a Kibana response (including `Boom`).
It also handles common concerns like abort signals.

```javascript
import { teapot } from '@hapi/boom';

const myRoute = createMyPluginServerRoute({
  endpoint: 'GET /internal/my_plugin/route',
  handler: async (resources) => {
    const { request, context, response, logger } = resources;

    const result = coinFlip();
    if (result === 'heads') {
        throw teapot();
    } else {
        return 'Hello, my route!';
    }
  },
});
```

Both the teapot error and the plain string will be translated into a Kibana response.

## Route dependencies

If you want to provide additional dependencies to your route, you need to change the generic argument to `createServerRouteFactory` and `registerRoutes`.

```javascript
import { createServerRouteFactory } from '@kbn/server-route-repository';
import { DefaultRouteHandlerResources } from '@kbn/server-route-repository-utils';

export interface MyPluginRouteDependencies {
    myDependency: MyDependency;
}

export const createMyPluginServerRoute = 
  createServerRouteFactory<DefaultRouteHandlerResources & MyPluginRouteDependencies>();
```

If you don't want your route to have access to the default resources, you could pass in only `MyPluginRouteDependencies`.

Then we use the same type when calling `registerRoutes`

```javascript
registerRoutes<MyPluginRouteDependencies>({
    core,
    logger,
    repository,
    dependencies: {
        myDependency: new MyDependency(),
    },
});
```

This way, when creating a route, you will have `myDependency` available in the route resources.

```javascript
import { createMyPluginServerRoute } from './create_my_plugin_server_route';

export const myRoute = createMyPluginServerRoute({
    endpoint: 'GET /internal/my_plugin/route',
    handler: async (resources) => {
        const { request, context, response, logger, myDependency } = resources;
        return response.ok({
            body: myDependency.sayHello(),
        });
    },
});
```

## Route creation options

Core HTTP allows certain options to be passed to the route when it's being created, and you may want to include your own options as well.  
To do this, override the second generic argument when calling `createServerRouteFactory`.

```javascript
import { createServerRouteFactory } from '@kbn/server-route-repository';
import {
  DefaultRouteHandlerResources,
  DefaultRouteCreateOptions,
} from '@kbn/server-route-repository-utils';

interface MyPluginRouteCreateOptions {
    isDangerous: boolean;
}

export const createMyPluginServerRoute = createServerRouteFactory<
  DefaultRouteHandlerResources,
  DefaultRouteCreateOptions & MyPluginRouteCreateOptions
>();
```

If you don't want your route to have access to the options provided by Core HTTP, you could pass in only `MyPluginRouteCreateOptions`.

You can then specify this option when creating the route.
```javascript
import { createMyPluginServerRoute } from './create_my_plugin_server_route';

export const myRoute = createMyPluginServerRoute({
    options: {
        access: 'internal',
    },
    isDangerous: true,
    endpoint: 'GET /internal/my_plugin/route',
    handler: async (resources) => {
        const { request, context, response, logger } = resources;
        return response.ok({
            body: 'Hello, my route!',
        });
    },
});
```

## Client calling options

Core HTTP allows certain options to be passed with the request, and you may want to include your own options as well.  
To do this, override the second generic argument when calling `createRepositoryClient`.

```javascript
import { DefaultClientOptions } from '@kbn/server-route-repository-utils';
import { createRepositoryClient } from '@kbn/server-route-repository-client';
import type { MyPluginRouteRepository } from '../server/plugin';

interface MyPluginClientOptions {
    makeSafe: boolean;
}

export type MyPluginRepositoryClient =
  ReturnType<typeof createRepositoryClient<MyPluginRouteRepository, DefaultClientOptions & MyPluginClientOptions>>;

class MyPlugin implements Plugin {
    public setup(core: CoreSetup) {
       const myPluginRepositoryClient =
        createRepositoryClient<MyPluginRouteRepository, DefaultClientOptions & MyPluginClientOptions>(core);

        myPluginRepositoryClient.fetch('GET /internal/my_plugin/route', {
            makeSafe: true,
            headers: {
                my_plugin_header: 'I am a header',
            },
        }).then(console.log);
    }
}
```

If you don't want your route to have access to the options provided by Core HTTP, you could pass in only `MyPluginClientOptions`.
