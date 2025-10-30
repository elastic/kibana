/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { apm } from '@elastic/apm-rum';
import {
  DEFAULT_MAX_ERROR_DURATION_MS,
  TRANSIENT_NAVIGATION_WINDOW_MS,
} from '../services/error_service';

import { BadComponent, ChunkLoadErrorComponent, getServicesMock } from '../../mocks';
import type { KibanaErrorBoundaryServices } from '../../types';
import { KibanaErrorBoundaryDepsProvider } from '../services/error_boundary_provider';
import { KibanaErrorService } from '../services/error_service';
import { KibanaErrorBoundary } from './error_boundary';
import { errorMessageStrings as strings } from './message_strings';

jest.mock('@elastic/apm-rum');

describe('<KibanaErrorBoundary>', () => {
  let services: KibanaErrorBoundaryServices;
  let user: ReturnType<typeof userEvent.setup>;
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    // Use fake timers for all tests so userEvent can drive microtasks deterministically.
    jest.useFakeTimers();
    services = getServicesMock();
    (apm.captureError as jest.Mock).mockClear();
    user = userEvent.setup({
      advanceTimers: async (ms) => {
        await jest.advanceTimersByTimeAsync(ms);
      },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const Template: FC<PropsWithChildren<unknown>> = ({ children }) => {
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
    await user.click(await findByTestId('clickForErrorBtn'));

    expect(await findByText(strings.page.callout.recoverable.title())).toBeVisible();
    expect(await findByText(strings.page.callout.recoverable.pageReloadButton())).toBeVisible();

    await user.click(await findByTestId('errorBoundaryRecoverablePromptReloadBtn'));

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('renders a fatal callout when an unknown error is caught', async () => {
    const reloadSpy = jest.spyOn(services, 'onClickRefresh');

    const { findByTestId, findByText } = render(
      <Template>
        <BadComponent />
      </Template>
    );
    await user.click(await findByTestId('clickForErrorBtn'));

    expect(await findByText(strings.page.callout.fatal.title())).toBeVisible();
    expect(await findByText(strings.page.callout.fatal.body())).toBeVisible();
    expect(await findByText(strings.page.callout.fatal.showDetailsButton())).toBeVisible();
    expect(await findByText(strings.page.callout.fatal.pageReloadButton())).toBeVisible();

    await user.click(await findByTestId('errorBoundaryFatalPromptReloadBtn'));

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
    await user.click(await findByTestId('clickForErrorBtn'));

    // Advance all timers to force auto-report (transient window + remaining duration)
    await jest.advanceTimersByTimeAsync(DEFAULT_MAX_ERROR_DURATION_MS);

    expect(mockDeps.analytics.reportEvent).toHaveBeenCalledTimes(1);
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

    await user.click(await findByTestId('clickForErrorBtn'));

    await jest.advanceTimersByTimeAsync(DEFAULT_MAX_ERROR_DURATION_MS);

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
    await user.click(await findByTestId('clickForErrorBtn'));

    expect(apm.captureError).toHaveBeenCalledTimes(1);
    expect(apm.captureError).toHaveBeenCalledWith(
      new Error('This is an error to show the test user!'),
      { labels: { error_type: 'PageFatalReactError' } }
    );
  });

  it('reports after transient window when unmounts early', async () => {
    const mockDeps = { analytics: { reportEvent: jest.fn() } };
    services.errorService = new KibanaErrorService(mockDeps);
    const { findByTestId, unmount } = render(
      <Template>
        <BadComponent />
      </Template>
    );

    await user.click(await findByTestId('clickForErrorBtn'));

    // Unmount early (simulate navigation or teardown before max duration)
    unmount();

    // Should not have reported yet (still in transient window)
    expect(mockDeps.analytics.reportEvent).not.toHaveBeenCalled();

    // Advance only the transient navigation window, not the full default max
    await jest.advanceTimersByTimeAsync(TRANSIENT_NAVIGATION_WINDOW_MS);

    // Should have reported exactly once
    expect(mockDeps.analytics.reportEvent).toHaveBeenCalledTimes(1);
    const payload = mockDeps.analytics.reportEvent.mock.calls[0][1];

    // Duration should reflect early commit (less than full default window, and <= transient window)
    expect(payload.component_render_min_duration_ms).toBeLessThanOrEqual(
      TRANSIENT_NAVIGATION_WINDOW_MS
    );
    expect(payload.component_name).toBe('BadComponent');
    expect(payload.error_message).toBe('Error: This is an error to show the test user!');
  });

  it('reports after max duration if not unmounted early', async () => {
    const mockDeps = { analytics: { reportEvent: jest.fn() } };
    services.errorService = new KibanaErrorService(mockDeps);
    const { findByTestId } = render(
      <Template>
        <BadComponent />
      </Template>
    );

    await user.click(await findByTestId('clickForErrorBtn'));

    // Should not have reported yet (still in transient window)
    expect(mockDeps.analytics.reportEvent).not.toHaveBeenCalled();

    // Advance until the max duration has fully elapsed
    await jest.advanceTimersByTimeAsync(DEFAULT_MAX_ERROR_DURATION_MS);

    // Should have reported exactly once
    expect(mockDeps.analytics.reportEvent).toHaveBeenCalledTimes(1);
    const payload = mockDeps.analytics.reportEvent.mock.calls[0][1];

    // Duration should reflect the max wait time
    expect(payload.component_render_min_duration_ms).toBeGreaterThanOrEqual(
      DEFAULT_MAX_ERROR_DURATION_MS
    );
    expect(payload.component_name).toBe('BadComponent');
    expect(payload.error_message).toBe('Error: This is an error to show the test user!');
  });
});
