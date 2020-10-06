/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { InjectedIntl as _InjectedIntl, InjectedIntlProps as _InjectedIntlProps } from 'react-intl';

export type InjectedIntl = _InjectedIntl;
export type InjectedIntlProps = _InjectedIntlProps;

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
