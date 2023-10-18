/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { render } from '@testing-library/react';
import React, { FC } from 'react';

import { KibanaErrorBoundary } from '../..';
import { BadComponent, ChunkLoadErrorComponent, getServicesMock } from '../../mocks';
import { KibanaErrorBoundaryServices } from '../../types';
import { KibanaErrorBoundaryDepsProvider } from '../services/error_boundary_services';

describe('<KibanaErrorBoundary>', () => {
  let services: KibanaErrorBoundaryServices;
  beforeEach(() => {
    services = getServicesMock();
  });

  const Template: FC = ({ children }) => {
    return (
      <KibanaErrorBoundaryDepsProvider {...services}>
        <KibanaErrorBoundary>{children}</KibanaErrorBoundary>
      </KibanaErrorBoundaryDepsProvider>
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

    expect(await findByText('Please refresh the page')).toBeVisible();
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

    expect(await findByText('Error encountered')).toBeVisible();
    expect(await findByText('Try refreshing this page.')).toBeVisible();
    expect(await findByText('Show details')).toBeVisible();
    expect(await findByText('Refresh')).toBeVisible();

    (await findByTestId('fatalPromptReloadBtn')).click();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });
});
