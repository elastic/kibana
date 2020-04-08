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

import {
  IRouter,
  RouteConfig,
  IKibanaResponse,
  ResponseHeaders,
  HttpResponseOptions,
  KibanaResponseFactory,
  RequestHandler,
} from '../http';

export interface StaticHttpResourcesRenderOptions extends HttpResourcesRenderOptions {
  path: string;
}

export interface HttpResourcesRenderOptions {
  headers?: ResponseHeaders;
}

export type HttpResourcesResponseOptions = HttpResponseOptions;

export interface HttpResourcesServiceToolkit {
  renderCoreApp: (options?: HttpResourcesRenderOptions) => Promise<IKibanaResponse>;
  renderAnonymousCoreApp: (options?: HttpResourcesRenderOptions) => Promise<IKibanaResponse>;
  renderHtml: (options: HttpResourcesResponseOptions) => IKibanaResponse;
  renderJs: (options: HttpResourcesResponseOptions) => IKibanaResponse;
}

export type HttpResourcesRequestHandler<P = unknown, Q = unknown, B = unknown> = RequestHandler<
  P,
  Q,
  B,
  'get',
  KibanaResponseFactory & HttpResourcesServiceToolkit
>;

export interface InternalHttpResourcesSetup {
  createRegistrar(router: IRouter): HttpResources;
}

export interface HttpResources {
  registerCoreApp: (route: StaticHttpResourcesRenderOptions) => void;
  registerAnonymousCoreApp: (route: StaticHttpResourcesRenderOptions) => void;
  register: <P, Q, B>(
    route: RouteConfig<P, Q, B, 'get'>,
    handler: HttpResourcesRequestHandler<P, Q, B>
  ) => void;
}
