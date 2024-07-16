/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OnErrorFn, IntlErrorCode } from '@formatjs/intl';

export const handleIntlError: OnErrorFn = (error) => {
  // Dont throw on missing translations.
  if (error.code !== IntlErrorCode.MISSING_TRANSLATION) {
    // eslint-disable-next-line no-console
    console.error(
      'Error Parsing translation string. This will start throwing an error once the i18n package tooling is upgraded.'
    );
    // eslint-disable-next-line no-console
    console.error(error);
  }
};
