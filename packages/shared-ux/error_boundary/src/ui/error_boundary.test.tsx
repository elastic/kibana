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
import { KibanaErrorService } from '../services/error_service';
import { errorMessageStrings as strings } from './message_strings';

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
    const reloadSpy = jest.spyOn(services, 'onClickRefresh');

    const { findByTestId, findByText } = render(
      <Template>
        <ChunkLoadErrorComponent />
      </Template>
    );
    (await findByTestId('clickForErrorBtn')).click();

    expect(await findByText(strings.recoverable.callout.title())).toBeVisible();
    expect(await findByText(strings.recoverable.callout.pageReloadButton())).toBeVisible();

    (await findByTestId('errorBoundaryRecoverablePromptReloadBtn')).click();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('renders a fatal callout when an unknown error is caught', async () => {
    const reloadSpy = jest.spyOn(services, 'onClickRefresh');

    const { findByTestId, findByText } = render(
      <Template>
        <BadComponent />
      </Template>
    );
    (await findByTestId('clickForErrorBtn')).click();

    expect(await findByText(strings.fatal.callout.title())).toBeVisible();
    expect(await findByText(strings.fatal.callout.body())).toBeVisible();
    expect(await findByText(strings.fatal.callout.showDetailsButton())).toBeVisible();
    expect(await findByText(strings.fatal.callout.pageReloadButton())).toBeVisible();

    (await findByTestId('errorBoundaryFatalPromptReloadBtn')).click();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('captures the error event for telemetry', async () => {
    const mockDeps = {
      analytics: { reportEvent: jest.fn() },
    };
    services.errorService = new KibanaErrorService(mockDeps);

    const { findByTestId } = render(
      <Template>
        <BadComponent />
      </Template>
    );
    (await findByTestId('clickForErrorBtn')).click();

    expect(mockDeps.analytics.reportEvent.mock.calls[0][0]).toBe('fatal-error-react');
    expect(mockDeps.analytics.reportEvent.mock.calls[0][1]).toMatchObject({
      component_name: 'BadComponent',
      error_message: 'Error: This is an error to show the test user!',
    });
  });

  it('captures component and error stack traces in telemetry', async () => {
    const mockDeps = {
      analytics: { reportEvent: jest.fn() },
    };
    services.errorService = new KibanaErrorService(mockDeps);

    const { findByTestId } = render(
      <Template>
        <BadComponent />
      </Template>
    );
    (await findByTestId('clickForErrorBtn')).click();

    expect(
      mockDeps.analytics.reportEvent.mock.calls[0][1].component_stack.includes('at BadComponent')
    ).toBe(true);
    expect(
      mockDeps.analytics.reportEvent.mock.calls[0][1].error_stack.startsWith(
        'Error: This is an error to show the test user!'
      )
    ).toBe(true);
  });
});
