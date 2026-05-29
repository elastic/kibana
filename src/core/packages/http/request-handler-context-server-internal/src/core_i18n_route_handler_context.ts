/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { I18nRequestHandlerContext, ServerTranslateArgs } from '@kbn/core-i18n-server';
import type { InternalI18nServiceStart } from '@kbn/core-i18n-server-internal';

/**
 * The concrete implementation of the i18n context available to route handlers
 * via `(await context.core).i18n`. It is a thin wrapper around the
 * `RequestI18nClient` produced by `InternalI18nServiceStart.asScopedToRequest`.
 *
 * @internal
 */
export class CoreI18nRouteHandlerContext implements I18nRequestHandlerContext {
  #client: ReturnType<InternalI18nServiceStart['asScopedToRequest']> | undefined;

  constructor(
    private readonly i18nStart: InternalI18nServiceStart,
    private readonly request: KibanaRequest
  ) {}

  private get client() {
    if (!this.#client) {
      this.#client = this.i18nStart.asScopedToRequest(this.request);
    }
    return this.#client;
  }

  getLocale(): Promise<string> {
    return this.client.getLocale();
  }

  translate(id: string, args: ServerTranslateArgs): Promise<string> {
    return this.client.translate(id, args);
  }

  formatList(type: 'conjunction' | 'disjunction' | 'unit', values: string[]): Promise<string> {
    return this.client.formatList(type, values);
  }
}
