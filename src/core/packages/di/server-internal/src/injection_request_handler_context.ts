/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { interfaces } from 'inversify';
import type { PluginOpaqueId } from '@kbn/core-base-common';
import type { CoreId } from '@kbn/core-base-common-internal';
import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import type { InjectionRequestHandlerContext } from '@kbn/core-di-server';
import { RequestToken, ResponseToken } from '@kbn/core-http-server';
import { Global } from '@kbn/core-di-common';
import type { InternalCoreDiServiceStart } from './internal_contracts';

/**
 * The {@link InjectionRequestHandlerContext} implementation.
 * @internal
 */
export class CoreInjectionRouteHandlerContext implements InjectionRequestHandlerContext {
  constructor(
    private readonly injectionServiceStart: InternalCoreDiServiceStart,
    private readonly request: KibanaRequest,
    private readonly response: KibanaResponseFactory,
    private readonly callerId: PluginOpaqueId | CoreId
  ) {}

  #container?: interfaces.Container;

  public get container() {
    if (this.#container == null) {
      this.#container = this.injectionServiceStart.fork();
      this.#container.bind(RequestToken).toConstantValue(this.request);
      this.#container.bind(ResponseToken).toConstantValue(this.response);
      this.#container.bind(Global).toConstantValue(RequestToken);
      this.#container.bind(Global).toConstantValue(ResponseToken);
    }

    return (
      this.injectionServiceStart.getContainer(this.callerId, this.#container) ?? this.#container
    );
  }
}
