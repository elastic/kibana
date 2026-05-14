/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@elastic/eui';
import './welcome.test.mocks';
import { Welcome } from './welcome';

const renderWelcome = (onSkip = jest.fn()) => {
  render(
    <I18nProvider>
      <EuiThemeProvider>
        <Welcome urlBasePath="" onSkip={onSkip} />
      </EuiThemeProvider>
    </I18nProvider>
  );
  return { onSkip };
};

test('should render a Welcome screen', () => {
  renderWelcome();
  expect(screen.getByText('Welcome to Elastic')).toBeInTheDocument();
});

test('clicking "Explore on my own" calls onSkip', async () => {
  const user = userEvent.setup();
  const { onSkip } = renderWelcome();
  await user.click(screen.getByTestId('skipWelcomeScreen'));
  expect(onSkip).toHaveBeenCalledTimes(1);
});
