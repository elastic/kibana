/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { ScopedTranslator, ScopedTranslateArgument } from '@kbn/core-i18n-common';

/**
 * Core's server-side internal implementation of {@link ScopedTranslator}
 * @internal
 */
export class ScopedTranslatorImpl implements ScopedTranslator {
  constructor(public readonly locale: string) {}

  translate(id: string, options: ScopedTranslateArgument) {
    return i18n.translate(id, { ...options, locale: this.locale });
  }
}
