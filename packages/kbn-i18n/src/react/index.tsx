/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { InjectedIntl as _InjectedIntl, InjectedIntlProps as _InjectedIntlProps } from 'react-intl';
export type { InjectedIntl, InjectedIntlProps } from 'react-intl';

export {
  intlShape,
  FormattedDate,
  FormattedTime,
  FormattedRelative,
  FormattedNumber,
  FormattedPlural,
  FormattedMessage,
  FormattedHTMLMessage,
  // Only used for testing. Use I18nProvider otherwise.
  IntlProvider as __IntlProvider,
} from 'react-intl';

export { I18nProvider } from './provider';
export { injectI18n } from './inject';
