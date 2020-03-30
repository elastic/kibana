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

import { RequestHandlerContext } from '../../../server';
import {
  IRouter,
  RouteConfig,
  IKibanaResponse,
  KibanaRequest,
  KibanaResponse,
  ResponseHeaders,
  HttpResponseOptions,
  KibanaResponseFactory,
} from '../router';
import { HttpConfig } from '../http_config';

export interface HttpResourcesRenderOptions {
  includeUserSettings?: boolean;
  headers?: ResponseHeaders;
}

export type HttpResourcesResponseOptions = HttpResponseOptions;

export interface HttpResourcesServiceToolkit {
  renderCoreApp: (options?: HttpResourcesRenderOptions) => Promise<KibanaResponse>;
  renderHtml: (options: HttpResourcesResponseOptions) => KibanaResponse;
  renderJs: (options: HttpResourcesResponseOptions) => KibanaResponse;
}

export type HttpResourcesRequestHandler<P = unknown, Q = unknown, B = unknown> = (
  context: RequestHandlerContext,
  request: KibanaRequest<P, Q, B, 'get'>,
  response: KibanaResponseFactory & HttpResourcesServiceToolkit
) => IKibanaResponse<any> | Promise<IKibanaResponse<any>>;

export interface HttpResourcesSetup {
  create(router: IRouter): HttpResources;
}

export interface HttpResources {
  registerCoreApp: (
    route: RouteConfig<any, any, any, 'get'>,
    options: HttpResourcesRenderOptions
  ) => void;
  register: <P, Q, B>(
    route: RouteConfig<P, Q, B, 'get'>,
    handler: HttpResourcesRequestHandler<P, Q, B>
  ) => void;
}

export class HttpResourcesService {
  setup(config: HttpConfig): HttpResourcesSetup {
    return {
      create(router: IRouter): HttpResources {
        return {
          registerCoreApp: (
            route: RouteConfig<unknown, unknown, unknown, 'get'>,
            options: HttpResourcesRenderOptions
          ) => {
            router.get(route, async (context, request, response) => {
              return response.ok({
                body: await context.core.rendering.render(options),
                headers: Object.assign({}, options.headers, {
                  'content-security-policy': config.csp.header,
                }),
              });
            });
          },
          register: <P, Q, B>(
            route: RouteConfig<P, Q, B, 'get'>,
            handler: HttpResourcesRequestHandler<P, Q, B>
          ) => {
            return router.get<P, Q, B>(route, (context, request, response) => {
              const resourceApi: HttpResourcesServiceToolkit = {
                async renderCoreApp(options: HttpResourcesRenderOptions = {}) {
                  return response.ok({
                    body: await context.core.rendering.render(options),
                    headers: Object.assign({}, options.headers, {
                      'content-security-policy': config.csp.header,
                    }),
                  });
                },
                renderHtml(options: HttpResourcesResponseOptions) {
                  return response.ok({
                    body: options.body,
                    headers: Object.assign(
                      { 'cache-control': 'private, no-cache, no-store' },
                      options.headers,
                      {
                        'content-type': 'text/html',
                        'content-security-policy': config.csp.header,
                      }
                    ),
                  });
                },
                renderJs(options: HttpResourcesResponseOptions) {
                  return response.ok({
                    body: options.body,
                    headers: Object.assign(
                      { 'cache-control': 'private, no-cache, no-store' },
                      options.headers,
                      {
                        'content-type': 'text/javascript',
                        'content-security-policy': config.csp.header,
                      }
                    ),
                  });
                },
              };
              return handler(context, request, { ...response, ...resourceApi });
            });
          },
        };
      },
    };
  }
}
