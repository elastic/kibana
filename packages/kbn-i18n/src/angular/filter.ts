/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { I18nServiceType } from './provider';

export const i18nFilter: [string, typeof i18nFilterFn] = ['i18n', i18nFilterFn];

function i18nFilterFn(i18n: I18nServiceType) {
  return (id: string, { defaultMessage = '', values = {} } = {}) => {
    return i18n(id, {
      values,
      defaultMessage,
    });
  };
}
