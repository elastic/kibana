/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ReadonlyContainer } from '@kbn/core-di-common';
import type { PluginOpaqueId } from '@kbn/core-base-common';
import type { CoreId } from '@kbn/core-base-common-internal';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { InjectionRequestHandlerContext } from '@kbn/core-di-server';
import type { InternalCoreDiServiceStart } from './internal_contracts';

/**
 * The {@link InjectionRequestHandlerContext} implementation.
 * @internal
 */
export class CoreInjectionRouteHandlerContext implements InjectionRequestHandlerContext {
  constructor(
    private readonly injectionServiceStart: InternalCoreDiServiceStart,
    private readonly request: KibanaRequest,
    private readonly callerId: PluginOpaqueId | CoreId
  ) {}

  #container?: ReadonlyContainer;

  public get container() {
    if (this.#container == null) {
      this.#container = this.injectionServiceStart.createRequestContainer(
        this.request,
        this.callerId
      );
    }
    return this.#container;
  }
}
