/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OnErrorFn, IntlErrorCode } from '@formatjs/intl';

export const handleIntlError: OnErrorFn = (error) => {
  /**
   * log any intl error except missing translations
   * we do not log on missing translations because our process
   * of translations happens after developers have commited their
   * strings in english.
   *
   * Previously we used to throw an error on malformed strings but
   * restricting to logging is less risky in cases of errors
   * for better UX (ie seeing `InvalidDate` is better than an empty screen)
   */
  if (error.code !== IntlErrorCode.MISSING_TRANSLATION) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
};
