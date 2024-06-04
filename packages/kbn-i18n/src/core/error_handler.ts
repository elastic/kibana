/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OnErrorFn, IntlErrorCode } from '@formatjs/intl';

export const handleIntlError: OnErrorFn = (error) => {
  /**
   * throw on any intl error except missing translations
   * we do not throw on missing translations because our process
   * of translations happens after developers have commited their
   * strings in english.
   */
  if (error.code !== IntlErrorCode.MISSING_TRANSLATION) {
    throw error;
  }
};
