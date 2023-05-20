/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// eslint-disable-next-line @kbn/eslint/module_migration
export type { IntlShape } from 'react-intl';

export {
  useIntl as useI18n,
  createIntl,
  createIntlCache,
  FormattedDate,
  FormattedTime,
  FormattedRelativeTime,
  FormattedNumber,
  FormattedPlural,
  FormattedMessage,
  FormattedHTMLMessage,
  // Only used for testing. Use I18nProvider otherwise.
  IntlProvider as __IntlProvider, // eslint-disable-next-line @kbn/eslint/module_migration
} from 'react-intl';

export { I18nProvider } from './src/provider';
export { injectI18n } from './src/inject';
