/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Logger } from '@kbn/logging';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type {
  IRouter,
  RouteConfig,
  KibanaRequest,
  KibanaResponseFactory,
} from '@kbn/core-http-server';
import type {
  InternalHttpServiceSetup,
  InternalHttpServicePreboot,
} from '@kbn/core-http-server-internal';
import type {
  InternalRenderingServicePreboot,
  InternalRenderingServiceSetup,
} from '@kbn/core-rendering-server-internal';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type {
  HttpResources,
  HttpResourcesResponseOptions,
  HttpResourcesRenderOptions,
  HttpResourcesRequestHandler,
  HttpResourcesServiceToolkit,
} from '@kbn/core-http-resources-server';

import type { InternalHttpResourcesSetup } from './types';

/**
 * @internal
 */
export interface PrebootDeps {
  http: InternalHttpServicePreboot;
  rendering: InternalRenderingServicePreboot;
}

/**
 * @internal
 */
export interface SetupDeps {
  http: InternalHttpServiceSetup;
  rendering: InternalRenderingServiceSetup;
}

export class HttpResourcesService implements CoreService<InternalHttpResourcesSetup> {
  private readonly logger: Logger;

  constructor(core: CoreContext) {
    this.logger = core.logger.get('http-resources');
  }

  preboot(deps: PrebootDeps) {
    this.logger.debug('prebooting HttpResourcesService');
    return {
      createRegistrar: this.createRegistrar.bind(this, deps),
    };
  }

  setup(deps: SetupDeps) {
    this.logger.debug('setting up HttpResourcesService');
    return {
      createRegistrar: this.createRegistrar.bind(this, deps),
    };
  }

  start() {}

  stop() {}

  private createRegistrar(
    deps: SetupDeps | PrebootDeps,
    router: IRouter<RequestHandlerContext>
  ): HttpResources {
    return {
      register: <P, Q, B, Context extends RequestHandlerContext = RequestHandlerContext>(
        route: RouteConfig<P, Q, B, 'get'>,
        handler: HttpResourcesRequestHandler<P, Q, B, Context>
      ) => {
        return router.get<P, Q, B>(
          {
            ...route,
            options: {
              access: 'public',
              ...route.options,
            },
          },
          (context, request, response) => {
            return handler(context as Context, request, {
              ...response,
              ...this.createResponseToolkit(deps, context, request, response),
            });
          }
        );
      },
    };
  }

  private createResponseToolkit(
    deps: SetupDeps | PrebootDeps,
    context: RequestHandlerContext,
    request: KibanaRequest,
    response: KibanaResponseFactory
  ): HttpResourcesServiceToolkit {
    return {
      async renderCoreApp(options: HttpResourcesRenderOptions = {}) {
        const { uiSettings } = await context.core;
        const body = await deps.rendering.render(request, uiSettings, {
          isAnonymousPage: false,
          includeExposedConfigKeys: options.includeExposedConfigKeys,
        });

        return response.ok({
          body,
          headers: options.headers,
        });
      },
      async renderAnonymousCoreApp(options: HttpResourcesRenderOptions = {}) {
        const { uiSettings } = await context.core;
        const body = await deps.rendering.render(request, uiSettings, {
          isAnonymousPage: true,
          includeExposedConfigKeys: options.includeExposedConfigKeys,
        });

        return response.ok({
          body,
          headers: options.headers,
        });
      },
      renderHtml(options: HttpResourcesResponseOptions) {
        return response.ok({
          body: options.body,
          headers: {
            ...options.headers,
            'content-type': 'text/html',
          },
        });
      },
      renderJs(options: HttpResourcesResponseOptions) {
        return response.ok({
          body: options.body,
          headers: {
            ...options.headers,
            'content-type': 'text/javascript',
          },
        });
      },
      renderCss(options: HttpResourcesResponseOptions) {
        return response.ok({
          body: options.body,
          headers: {
            ...options.headers,
            'content-type': 'text/css',
          },
        });
      },
    };
  }
}
