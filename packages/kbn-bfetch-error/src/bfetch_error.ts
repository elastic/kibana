/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

/**
 * Error thrown when xhr request fails
 * @public
 */
export class BfetchRequestError extends Error {
  /**
   * constructor
   * @param code - Xhr error code
   */
  constructor(code: number) {
    const message =
      code === 0
        ? i18n.translate('bfetchError.networkError', {
            defaultMessage: 'Check your network connection and try again.',
          })
        : i18n.translate('bfetchError.networkErrorWithStatus', {
            defaultMessage: 'Check your network connection and try again. Code {code}',
            values: { code },
          });

    super(message);
    this.name = 'BfetchRequestError';
    this.code = code;
  }

  code: number;
}
