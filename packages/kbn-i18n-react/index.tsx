/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IntlShape, WrappedComponentProps } from 'react-intl';
import {
  FormattedDate,
  FormattedTime,
  FormattedNumber,
  FormattedPlural,
  FormattedMessage,
  FormattedRelativeTime,
} from 'react-intl';

export type { IntlShape, WrappedComponentProps };
export {
  FormattedDate,
  FormattedTime,
  FormattedNumber,
  FormattedPlural,
  FormattedMessage,
  FormattedRelativeTime,
};

export { FormattedRelative } from './src/compatiblity_layer';
export type { FormattedRelativeProps } from './src/compatiblity_layer';
export { I18nProvider } from './src/provider';
export { injectI18n, useI18n } from './src/inject';
