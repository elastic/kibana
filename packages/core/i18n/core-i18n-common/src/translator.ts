/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TranslateArguments } from '@kbn/i18n';

export type ScopedTranslateArgument = Omit<TranslateArguments, 'locale'>;

/**
 * An instance of a translator scoped to a specific locale.
 *
 * @public
 */
export interface ScopedTranslator {
  /**
   * The locale the scoped translator is bound to.
   */
  readonly locale: string;

  /**
   * Translate message
   */
  translate(id: string, options: ScopedTranslateArgument): string;
}
