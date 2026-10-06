/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { IRouter } from '@kbn/core-http-server';
import type {
  InternalHttpServiceSetup,
  InternalHttpServicePreboot,
} from '@kbn/core-http-server-internal';
import type {
  InternalRenderingServicePreboot,
  InternalRenderingServiceSetup,
} from '@kbn/core-rendering-server-internal';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { HttpResources } from '@kbn/core-http-resources-server';
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
export declare class HttpResourcesService implements CoreService<InternalHttpResourcesSetup> {
  private readonly logger;
  constructor(core: CoreContext);
  preboot(deps: PrebootDeps): {
    createRegistrar: (router: IRouter<RequestHandlerContext>) => HttpResources;
  };
  setup(deps: SetupDeps): {
    createRegistrar: (router: IRouter<RequestHandlerContext>) => HttpResources;
  };
  start(): void;
  stop(): void;
  private createRegistrar;
  private createResponseToolkit;
}
