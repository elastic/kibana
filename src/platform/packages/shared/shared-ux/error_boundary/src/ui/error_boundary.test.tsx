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
});
