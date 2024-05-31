/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, PropsWithChildren } from 'react';

// eslint-disable-next-line @kbn/eslint/module_migration
import { IntlProvider } from 'react-intl';
import { i18n } from '@kbn/i18n';

const emptyMessages = {};

export const I18nProviderMock: FC<PropsWithChildren<unknown>> = ({ children }) => {
  return (
    <IntlProvider
      locale={i18n.getLocale()}
      messages={emptyMessages}
      defaultLocale={i18n.getLocale()}
      formats={i18n.getFormats()}
      textComponent={React.Fragment}
    >
      {children}
    </IntlProvider>
  );
};
