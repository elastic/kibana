/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { IntlProvider } from '..';

/**
 * The library uses the provider pattern to scope an i18n context to a tree
 * of components. This component is used to setup the i18n context for a tree.
 * IntlProvider should wrap react app's root component (inside each react render method).
 */
export const I18nProvider: React.FC = ({ children }) => {
  const { messages, formats, locale, defaultLocale } = i18n.getTranslation();

  return (
    <IntlProvider
      locale={locale}
      messages={messages}
      formats={formats}
      defaultLocale={defaultLocale}
      onError={i18n.handleIntlError}
    >
      {children}
    </IntlProvider>
  );
};
