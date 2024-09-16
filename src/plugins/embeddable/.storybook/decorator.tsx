/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { DecoratorFn } from '@storybook/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';

export const servicesContextDecorator: DecoratorFn = (story, { globals }) => {
  const darkMode = ['v8.dark', 'v7.dark'].includes(globals.euiTheme);

  return (
    <I18nProvider>
      <EuiThemeProvider darkMode={darkMode}>{story()}</EuiThemeProvider>
    </I18nProvider>
  );
};
