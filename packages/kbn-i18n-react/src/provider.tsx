/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as PropTypes from 'prop-types';
import * as React from 'react';

// eslint-disable-next-line @kbn/eslint/module_migration
import { IntlProvider } from 'react-intl';

import { i18n } from '@kbn/i18n';
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
