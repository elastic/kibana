/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import * as PropTypes from 'prop-types';
// eslint-disable-next-line @kbn/eslint/module_migration
import { IntlProvider, FormattedMessage } from 'react-intl';
import { i18n } from '@kbn/i18n';

const emptyMessages = {};
const locale = 'en_EN';

export const I18nProviderMock: React.FC = ({ children }) => {
  return (
    <IntlProvider
      locale={locale}
      messages={emptyMessages}
      defaultLocale={locale}
      formats={i18n.getFormats()}
      textComponent={React.Fragment}
    >
      <MockTranslateWrapper>{children}</MockTranslateWrapper>
    </IntlProvider>
  );
};

// inspired from PseudoLocaleWrapper
class MockTranslateWrapper extends React.PureComponent {
  public static propTypes = { children: PropTypes.element.isRequired };

  public static contextTypes = {
    intl: PropTypes.object.isRequired,
  };

  constructor(props: { children: React.ReactNode }, context: any) {
    super(props, context);

    context.intl.formatMessage = (message: FormattedMessage.MessageDescriptor) => {
      return message.defaultMessage ?? message.id;
    };
  }

  public render() {
    return this.props.children;
  }
}
