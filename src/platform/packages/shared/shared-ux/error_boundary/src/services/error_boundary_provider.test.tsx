/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import React from 'react';

import { KibanaErrorBoundary, KibanaErrorBoundaryProvider } from '../..';
import { BadComponent } from '../../mocks';
import { errorMessageStrings as strings } from '../ui/message_strings';
import userEvent from '@testing-library/user-event';

describe('<KibanaErrorBoundaryProvider>', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('creates a context of services for KibanaErrorBoundary', async () => {
    const { findByTestId, findByText } = render(
      <KibanaErrorBoundaryProvider>
        <KibanaErrorBoundary>
          <BadComponent />
        </KibanaErrorBoundary>
      </KibanaErrorBoundaryProvider>
    );
    await userEvent.click(await findByTestId('clickForErrorBtn'));

    expect(await findByText(strings.page.callout.fatal.title())).toBeVisible();
  });

  it('uses higher-level context if available', async () => {
    const { findByTestId, findByText } = render(
      <KibanaErrorBoundaryProvider>
        <KibanaErrorBoundary>
          Hello world
          <KibanaErrorBoundaryProvider>
            <KibanaErrorBoundary>
              <BadComponent />
            </KibanaErrorBoundary>
          </KibanaErrorBoundaryProvider>
        </KibanaErrorBoundary>
      </KibanaErrorBoundaryProvider>
    );
    await userEvent.click(await findByTestId('clickForErrorBtn'));

    expect(await findByText(strings.page.callout.fatal.title())).toBeVisible();
  });
});
