/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { RequestHandlerContext } from 'src/core/server';

import { CoreContext } from '../core_context';
import {
  IRouter,
  RouteConfig,
  InternalHttpServiceSetup,
  KibanaRequest,
  KibanaResponseFactory,
} from '../http';

import { Logger } from '../logging';
import { InternalRenderingServiceSetup } from '../rendering';
import { CoreService } from '../../types';

import {
  InternalHttpResourcesSetup,
  HttpResources,
  HttpResourcesResponseOptions,
  HttpResourcesRenderOptions,
  HttpResourcesRequestHandler,
  HttpResourcesServiceToolkit,
} from './types';

export interface SetupDeps {
  http: InternalHttpServiceSetup;
  rendering: InternalRenderingServiceSetup;
}

export class HttpResourcesService implements CoreService<InternalHttpResourcesSetup> {
  private readonly logger: Logger;
  constructor(core: CoreContext) {
    this.logger = core.logger.get('http-resources');
  }

  setup(deps: SetupDeps) {
    this.logger.debug('setting up HttpResourcesService');
    return {
      createRegistrar: this.createRegistrar.bind(this, deps),
    };
  }

  start() {}
  stop() {}

  private createRegistrar(deps: SetupDeps, router: IRouter): HttpResources {
    return {
      register: <P, Q, B>(
        route: RouteConfig<P, Q, B, 'get'>,
        handler: HttpResourcesRequestHandler<P, Q, B>
      ) => {
        return router.get<P, Q, B>(route, (context, request, response) => {
          return handler(context, request, {
            ...response,
            ...this.createResponseToolkit(deps, context, request, response),
          });
        });
      },
    };
  }

  private createResponseToolkit(
    deps: SetupDeps,
    context: RequestHandlerContext,
    request: KibanaRequest,
    response: KibanaResponseFactory
  ): HttpResourcesServiceToolkit {
    const cspHeader = deps.http.csp.header;
    return {
      async renderCoreApp(options: HttpResourcesRenderOptions = {}) {
        const body = await deps.rendering.render(request, context.core.uiSettings.client, {
          includeUserSettings: true,
        });

        return response.ok({
          body,
          headers: { ...options.headers, 'content-security-policy': cspHeader },
        });
      },
      async renderAnonymousCoreApp(options: HttpResourcesRenderOptions = {}) {
        const body = await deps.rendering.render(request, context.core.uiSettings.client, {
          includeUserSettings: false,
        });

        return response.ok({
          body,
          headers: { ...options.headers, 'content-security-policy': cspHeader },
        });
      },
      renderHtml(options: HttpResourcesResponseOptions) {
        return response.ok({
          body: options.body,
          headers: {
            ...options.headers,
            'content-type': 'text/html',
            'content-security-policy': cspHeader,
          },
        });
      },
      renderJs(options: HttpResourcesResponseOptions) {
        return response.ok({
          body: options.body,
          headers: {
            ...options.headers,
            'content-type': 'text/javascript',
            'content-security-policy': cspHeader,
          },
        });
      },
    };
  }
}
