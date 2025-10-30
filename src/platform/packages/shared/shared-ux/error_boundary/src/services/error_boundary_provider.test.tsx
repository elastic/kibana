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
import { TRANSIENT_NAVIGATION_WINDOW_MS } from './error_service';
import userEvent from '@testing-library/user-event';

describe('<KibanaErrorBoundaryProvider>', () => {
  let analytics: KibanaErrorBoundaryProviderDeps['analytics'];
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    analytics = analyticsServiceMock.createAnalyticsServiceStart();
  });

  it('creates a context of services for KibanaErrorBoundary', async () => {
    const reportEventSpy = jest.spyOn(analytics!, 'reportEvent');

    const { findByTestId, unmount } = render(
      <KibanaErrorBoundaryProvider analytics={analytics}>
        <KibanaErrorBoundary>
          <BadComponent />
        </KibanaErrorBoundary>
      </KibanaErrorBoundaryProvider>
    );
    await userEvent.click(await findByTestId('clickForErrorBtn'));
    unmount(); // Unmount to commit/report the error

    // Wait for the error to be reported/committed
    await new Promise((resolve) => setTimeout(resolve, 1.5 * TRANSIENT_NAVIGATION_WINDOW_MS));

    expect(reportEventSpy).toBeCalledWith('fatal-error-react', {
      component_name: 'BadComponent',
      component_stack: expect.any(String),
      error_message: 'Error: This is an error to show the test user!',
      error_stack: expect.any(String),
      component_render_min_duration_ms: expect.any(Number),
      has_transient_navigation: expect.any(Boolean),
    });
  });

  it('uses higher-level context if available', async () => {
    const reportEventParentSpy = jest.spyOn(analytics!, 'reportEvent');

    const analyticsChild = analyticsServiceMock.createAnalyticsServiceStart();
    const reportEventChildSpy = jest.spyOn(analyticsChild, 'reportEvent');

    const { findByTestId, unmount } = render(
      <KibanaErrorBoundaryProvider analytics={analytics}>
        <KibanaErrorBoundary>
          Hello world
          <KibanaErrorBoundaryProvider analytics={analyticsChild}>
            <KibanaErrorBoundary>
              <BadComponent />
            </KibanaErrorBoundary>
          </KibanaErrorBoundaryProvider>
        </KibanaErrorBoundary>
      </KibanaErrorBoundaryProvider>
    );
    await userEvent.click(await findByTestId('clickForErrorBtn'));

    // Wait for nav to settle
    await new Promise((resolve) => setTimeout(resolve, TRANSIENT_NAVIGATION_WINDOW_MS));

    unmount(); // Unmount to commit/report the error

    // Wait for the error to be reported/committed
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(reportEventParentSpy).not.toBeCalled();
    expect(reportEventChildSpy).toBeCalledWith('fatal-error-react', {
      component_name: 'BadComponent',
      component_stack: expect.any(String),
      error_message: 'Error: This is an error to show the test user!',
      error_stack: expect.any(String),
      has_transient_navigation: expect.any(Boolean),
      component_render_min_duration_ms: expect.any(Number),
    });
    expect(
      (reportEventChildSpy.mock.calls[0][1] as Record<string, unknown>)
        .component_render_min_duration_ms
    ).toBeGreaterThanOrEqual(250);
  });
});
