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
import { PseudoLocaleWrapper } from './pseudo_locale_wrapper';

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
        <PseudoLocaleWrapper>{this.props.children}</PseudoLocaleWrapper>
      </IntlProvider>
    );
  }
}
