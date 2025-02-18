/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import React, { FC, PropsWithChildren } from 'react';
import { apm } from '@elastic/apm-rum';

import { BadComponent, ChunkLoadErrorComponent, getServicesMock } from '../../mocks';
import { KibanaErrorBoundaryServices } from '../../types';
import { KibanaErrorBoundaryDepsProvider } from '../services/error_boundary_services';
import { KibanaErrorService } from '../services/error_service';
import { KibanaSectionErrorBoundary } from './section_error_boundary';
import { errorMessageStrings as strings } from './message_strings';

jest.mock('@elastic/apm-rum');

describe('<KibanaSectionErrorBoundary>', () => {
  let services: KibanaErrorBoundaryServices;
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    services = getServicesMock();
    (apm.captureError as jest.Mock).mockClear();
  });

  const Template: FC<PropsWithChildren<unknown>> = ({ children }) => {
    return (
      <KibanaErrorBoundaryDepsProvider {...services}>
        <KibanaSectionErrorBoundary sectionName="test section name">
          {children}
        </KibanaSectionErrorBoundary>
      </KibanaErrorBoundaryDepsProvider>
    );
  };

  it('allow children to render when there is no error', () => {
    const inputText = 'Hello, beautiful world.';
    const res = render(<Template>{inputText}</Template>);
    expect(res.getByText(inputText)).toBeInTheDocument();
  });

  it('renders a recoverable prompt when a recoverable error is caught', () => {
    const reloadSpy = jest.spyOn(services, 'onClickRefresh');

    const { getByTestId, getByText } = render(
      <Template>
        <ChunkLoadErrorComponent />
      </Template>
    );
    getByTestId('clickForErrorBtn').click();

    expect(getByText(strings.section.callout.recoverable.title('test section name'))).toBeVisible();
    expect(getByText(strings.section.callout.recoverable.body('test section name'))).toBeVisible();
    expect(getByText(strings.section.callout.recoverable.pageReloadButton())).toBeVisible();

    getByTestId('sectionErrorBoundaryRecoverBtn').click();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('renders a fatal prompt when a fatal error is caught', () => {
    const { getByTestId, getByText } = render(
      <Template>
        <BadComponent />
      </Template>
    );
    getByTestId('clickForErrorBtn').click();

    expect(getByText(strings.section.callout.fatal.title('test section name'))).toBeVisible();
    expect(getByText(strings.section.callout.fatal.body('test section name'))).toBeVisible();
    expect(getByText(strings.section.callout.fatal.showDetailsButton())).toBeVisible();
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
      error_message: 'FatalReactError: This is an error to show the test user!',
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

  it('integrates with apm to capture the error', async () => {
    const { findByTestId } = render(
      <Template>
        <BadComponent />
      </Template>
    );
    (await findByTestId('clickForErrorBtn')).click();

    expect(apm.captureError).toHaveBeenCalledTimes(1);
    expect(apm.captureError).toHaveBeenCalledWith(
      new Error('This is an error to show the test user!')
    );
    expect(Object.keys((apm.captureError as jest.Mock).mock.calls[0][0])).toEqual([
      'react_error_type',
      'original_name',
      'name',
    ]);
    expect((apm.captureError as jest.Mock).mock.calls[0][0].react_error_type).toEqual(
      'fatal-error-react'
    );
  });
});
