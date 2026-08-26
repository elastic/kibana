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

import { BadComponent, ChunkLoadErrorComponent, getServicesMock } from '../../mocks';
import type { KibanaErrorBoundaryServices } from '../../types';
import { KibanaErrorBoundaryDepsProvider } from '../services/error_boundary_provider';
import { KibanaSectionErrorBoundary } from './section_error_boundary';
import { errorMessageStrings as strings } from './message_strings';

jest.mock('@elastic/apm-rum');

describe('<KibanaSectionErrorBoundary>', () => {
  let services: KibanaErrorBoundaryServices;
  let user: ReturnType<typeof userEvent.setup>;
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
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

  const Template: FC<PropsWithChildren<{ maxRetries?: number }>> = ({
    children,
    maxRetries = 0,
  }) => {
    return (
      <KibanaErrorBoundaryDepsProvider {...services}>
        <KibanaSectionErrorBoundary sectionName="test section name" maxRetries={maxRetries}>
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

  it('renders a recoverable prompt when a recoverable error is caught', async () => {
    const reloadSpy = jest.spyOn(services, 'onClickRefresh');

    const { getByTestId, getByText } = render(
      <Template>
        <ChunkLoadErrorComponent />
      </Template>
    );
    await user.click(getByTestId('clickForErrorBtn'));

    expect(getByText(strings.section.callout.recoverable.title('test section name'))).toBeVisible();
    expect(getByText(strings.section.callout.recoverable.body('test section name'))).toBeVisible();
    expect(getByText(strings.section.callout.recoverable.pageReloadButton())).toBeVisible();

    await user.click(getByTestId('sectionErrorBoundaryRecoverBtn'));

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('renders a fatal prompt when a fatal error is caught', async () => {
    const { getByTestId, getByText } = render(
      <Template>
        <BadComponent />
      </Template>
    );
    await user.click(getByTestId('clickForErrorBtn'));

    expect(getByText(strings.section.callout.fatal.title('test section name'))).toBeVisible();
    expect(getByText(strings.section.callout.fatal.body('test section name'))).toBeVisible();
    expect(getByText(strings.section.callout.fatal.showDetailsButton())).toBeVisible();
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
      { labels: { error_type: 'SectionFatalReactError' } }
    );
  });

  describe('maxRetries behavior', () => {
    it('defaults to maxRetries=0 and shows error immediately', async () => {
      const { getByTestId, getByText } = render(
        <Template>
          <BadComponent />
        </Template>
      );
      await user.click(getByTestId('clickForErrorBtn'));

      // Error prompt should be visible immediately with no retries
      expect(getByText(strings.section.callout.fatal.title('test section name'))).toBeVisible();
    });

    it('shows error prompt after maxRetries exhausted', async () => {
      const { getByTestId, getByText, queryByText } = render(
        <Template maxRetries={1}>
          <BadComponent />
        </Template>
      );

      // Trigger first error (will retry)
      await user.click(getByTestId('clickForErrorBtn'));

      // Error prompt should NOT be visible yet (it's retrying)
      expect(queryByText(strings.section.callout.fatal.title('test section name'))).toBeNull();

      // Trigger error again (second error, exceeds maxRetries)
      // Since we're in a retried state, clicking the button again triggers another error
      await user.click(getByTestId('clickForErrorBtn'));

      // Now error prompt should be visible (retries exhausted)
      expect(getByText(strings.section.callout.fatal.title('test section name'))).toBeVisible();
    });
  });
});
