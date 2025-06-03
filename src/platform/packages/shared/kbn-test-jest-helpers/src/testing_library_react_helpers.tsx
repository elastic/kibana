/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@elastic/eui';

export const renderWithKibanaRenderContext = (...args: Parameters<typeof render>) => {
  const [ui, ...remainingRenderArgs] = args;
  return render(
    <EuiThemeProvider>
      <I18nProvider>{ui}</I18nProvider>
    </EuiThemeProvider>,
    ...remainingRenderArgs
  );
};

export const renderWithI18n = (...args: Parameters<typeof render>) => {
  const [ui, ...remainingRenderArgs] = args;
  // Avoid using { wrapper: I18nProvider } in case the caller adds a custom wrapper.
  return render(<I18nProvider>{ui}</I18nProvider>, ...remainingRenderArgs);
};

export const renderWithEuiTheme = (...args: Parameters<typeof render>) => {
  const [ui, ...remainingRenderArgs] = args;
  // Avoid using { wrapper: EuiThemeProvider } in case the caller adds a custom wrapper.
  return render(<EuiThemeProvider>{ui}</EuiThemeProvider>, ...remainingRenderArgs);
};
