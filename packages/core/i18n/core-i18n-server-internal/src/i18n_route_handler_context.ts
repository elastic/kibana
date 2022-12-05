/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { I18nRequestHandlerContext, I18nServiceStart } from '@kbn/core-i18n-server';
import { ScopedTranslatorImpl } from './scoped_translator';

export class CoreI18nRouteHandlerContext implements I18nRequestHandlerContext {
  #translator?: ScopedTranslatorImpl;

  constructor(
    private readonly i18nStart: I18nServiceStart,
    private readonly request: KibanaRequest
  ) {}

  public get translator() {
    if (this.#translator == null) {
      const locale = this.i18nStart.getLocaleForRequest(this.request);
      this.#translator = this.i18nStart.getScopedTranslator(locale);
    }
    return this.#translator;
  }
}
