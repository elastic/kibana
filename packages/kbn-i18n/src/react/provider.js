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

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { IntlProvider } from 'react-intl';

import * as i18n from '../core/i18n';

/**
 * The library uses the provider pattern to scope an i18n context to a tree
 * of components. This component is used to setup the i18n context for a tree.
 * IntlProvider should wrap react app's root component (inside each react render method).
 */
export class I18nProvider extends PureComponent {
  static propTypes = {
    children: PropTypes.object,
  };

  render() {
    const { children } = this.props;

    return (
      <IntlProvider
        locale={i18n.getLocale()}
        messages={i18n.getMessages()}
        defaultLocale={i18n.getDefaultLocale()}
        formats={i18n.getFormats()}
        defaultFormats={i18n.getFormats()}
      >
        {children}
      </IntlProvider>
    );
  }
}
