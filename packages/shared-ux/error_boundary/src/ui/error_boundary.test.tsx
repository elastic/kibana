/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { render } from '@testing-library/react';

import { BadComponent, ChunkLoadErrorComponent, getServicesMock } from '../../mocks';
import { ErrorBoundary, ErrorBoundaryProvider } from '../..';
import { ErrorBoundaryServices } from '../../types';

describe('<ErrorBoundary>', () => {
  let services: ErrorBoundaryServices;
  beforeEach(() => {
    services = getServicesMock();
  });

  const Template: FC = ({ children }) => {
    return (
      <ErrorBoundaryProvider {...services}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </ErrorBoundaryProvider>
    );
  };

  it('allow children to render when there is no error', () => {
    const inputText = 'Hello, beautiful world.';
    const res = render(<Template>{inputText}</Template>);
    expect(res.getByText(inputText)).toBeInTheDocument();
  });

  it('renders a "soft" callout when an unknown error is caught', async () => {
    const reloadSpy = jest.spyOn(services, 'reloadWindow');

    const { findByTestId, findByText } = render(
      <Template>
        <ChunkLoadErrorComponent />
      </Template>
    );
    (await findByTestId('clickForErrorBtn')).click();

    expect(await findByText('You need to refresh')).toBeVisible();
    expect(await findByText('Refresh')).toBeVisible();

    (await findByTestId('recoverablePromptReloadBtn')).click();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('renders a fatal callout when an unknown error is caught', async () => {
    const reloadSpy = jest.spyOn(services, 'reloadWindow');

    const { findByTestId, findByText } = render(
      <Template>
        <BadComponent />
      </Template>
    );
    (await findByTestId('clickForErrorBtn')).click();

    expect(await findByText('An error was encountered')).toBeVisible();
    expect(await findByText('Try refreshing this page.')).toBeVisible();
    expect(await findByText('Show details')).toBeVisible();
    expect(await findByText('Refresh')).toBeVisible();

    (await findByTestId('fatalPromptReloadBtn')).click();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });
});
