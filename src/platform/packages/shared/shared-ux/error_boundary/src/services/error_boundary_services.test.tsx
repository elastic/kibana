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

import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { KibanaErrorBoundaryProviderDeps } from '../../types';
import { KibanaErrorBoundary, KibanaErrorBoundaryProvider } from '../..';
import { BadComponent } from '../../mocks';

describe('<KibanaErrorBoundaryProvider>', () => {
  let analytics: KibanaErrorBoundaryProviderDeps['analytics'];
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    analytics = analyticsServiceMock.createAnalyticsServiceStart();
  });

  it('creates a context of services for KibanaErrorBoundary', async () => {
    const reportEventSpy = jest.spyOn(analytics!, 'reportEvent');

    const { findByTestId } = render(
      <KibanaErrorBoundaryProvider analytics={analytics}>
        <KibanaErrorBoundary>
          <BadComponent />
        </KibanaErrorBoundary>
      </KibanaErrorBoundaryProvider>
    );
    (await findByTestId('clickForErrorBtn')).click();

    expect(reportEventSpy).toBeCalledWith('fatal-error-react', {
      component_name: 'BadComponent',
      component_stack: expect.any(String),
      error_message: 'FatalReactError: This is an error to show the test user!',
      error_stack: expect.any(String),
    });
  });

  it('uses higher-level context if available', async () => {
    const reportEventSpy1 = jest.spyOn(analytics!, 'reportEvent');

    const analytics2 = analyticsServiceMock.createAnalyticsServiceStart();
    const reportEventSpy2 = jest.spyOn(analytics2, 'reportEvent');

    const { findByTestId } = render(
      <KibanaErrorBoundaryProvider analytics={analytics}>
        <KibanaErrorBoundary>
          Hello world
          <KibanaErrorBoundaryProvider analytics={analytics2}>
            <KibanaErrorBoundary>
              <BadComponent />
            </KibanaErrorBoundary>
          </KibanaErrorBoundaryProvider>
        </KibanaErrorBoundary>
      </KibanaErrorBoundaryProvider>
    );
    (await findByTestId('clickForErrorBtn')).click();

    expect(reportEventSpy2).not.toBeCalled();
    expect(reportEventSpy1).toBeCalledWith('fatal-error-react', {
      component_name: 'BadComponent',
      component_stack: expect.any(String),
      error_message: 'FatalReactError: This is an error to show the test user!',
      error_stack: expect.any(String),
    });
  });
});
