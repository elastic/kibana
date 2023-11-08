/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
      error_message: 'Error: This is an error to show the test user!',
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
      error_message: 'Error: This is an error to show the test user!',
    });
  });
});
