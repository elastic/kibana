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

import * as PropTypes from 'prop-types';
import * as React from 'react';
import { IntlProvider } from 'react-intl';

import * as i18n from '../core';
import { isPseudoLocale, translateUsingPseudoLocale } from '../core/pseudo_locale';
import { injectI18n } from './inject';

/**
 * To translate label that includes nested `FormattedMessage` instances React Intl
 * replaces them with special placeholders (@__uid__@ELEMENT-uid-counter@__uid__@)
 * and maps them back with nested translations after `formatMessage` processes
 * original string, so we shouldn't modify these special placeholders with pseudo
 * translations otherwise React Intl won't be able to properly replace placeholders.
 * It's implementation detail of the React Intl, but since pseudo localization is dev
 * only feature we should be fine here.
 * @param message
 */
function translateFormattedMessageUsingPseudoLocale(message: string) {
  const formattedMessageDelimiter = message.match(/@__.{10}__@/);
  if (formattedMessageDelimiter !== null) {
    return message
      .split(formattedMessageDelimiter[0])
      .map(part => (part.startsWith('ELEMENT-') ? part : translateUsingPseudoLocale(part)))
      .join(formattedMessageDelimiter[0]);
  }

  return translateUsingPseudoLocale(message);
}

/**
 * If pseudo locale is detected, default intl.formatMessage should be decorated
 * with the pseudo localization function.
 * @param child I18nProvider child component.
 */
function wrapIntlFormatMessage(child: React.ReactNode) {
  return React.createElement(
    injectI18n(({ intl }) => {
      const formatMessage = intl.formatMessage;
      intl.formatMessage = (...args) =>
        translateFormattedMessageUsingPseudoLocale(formatMessage(...args));

      return React.Children.only(child);
    })
  );
}

/**
 * The library uses the provider pattern to scope an i18n context to a tree
 * of components. This component is used to setup the i18n context for a tree.
 * IntlProvider should wrap react app's root component (inside each react render method).
 */
export class I18nProvider extends React.PureComponent {
  public static propTypes = { children: PropTypes.element.isRequired };

  public render() {
    return (
      <IntlProvider
        locale={i18n.getLocale()}
        messages={i18n.getTranslation().messages}
        defaultLocale={i18n.getDefaultLocale()}
        formats={i18n.getFormats()}
        textComponent={React.Fragment}
      >
        {isPseudoLocale(i18n.getLocale())
          ? wrapIntlFormatMessage(this.props.children)
          : this.props.children}
      </IntlProvider>
    );
  }
}
