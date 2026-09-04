/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import type { EuiBreakpointSize } from '@elastic/eui';
import type { InternalChromeStart } from '@kbn/core-chrome-browser-internal-types';
import { ChromeServiceProvider } from '@kbn/core-chrome-browser-context';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/ui-app-header';
import { DashboardAppHeader } from './dashboard_app_header';
import type { DashboardAppHeaderAiAction } from './dashboard_app_header';

let mockCurrentBreakpoint: EuiBreakpointSize | undefined = 'xl';
let mockViewportBreakpoint: EuiBreakpointSize = 'xl';

jest.mock('@kbn/ui-chrome-layout', () => ({
  useCurrentChromeApplicationBreakpoint: () => mockCurrentBreakpoint,
}));

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');

  return {
    ...actual,
    useCurrentEuiBreakpoint: () => mockViewportBreakpoint,
  };
});

const renderHeader = (
  ui: React.ReactElement,
  chrome: InternalChromeStart = chromeServiceMock.createStartContract()
) => {
  return render(<ChromeServiceProvider value={{ chrome }}>{ui}</ChromeServiceProvider>);
};

const createAiAction = (
  overrides: Partial<DashboardAppHeaderAiAction> = {}
): DashboardAppHeaderAiAction => ({
  id: 'dashboard-ai',
  label: 'Ask AI',
  run: jest.fn(),
  ...overrides,
});

describe('DashboardAppHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentBreakpoint = 'xl';
    mockViewportBreakpoint = 'xl';
  });

  it('renders the normal header when aiAction is omitted', async () => {
    renderHeader(<DashboardAppHeader title="Dashboard" />);

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'Dashboard'
    );
    expect(screen.queryByRole('button', { name: 'Ask AI' })).not.toBeInTheDocument();
  });

  it('renders the empty-style AI control, maps props, and runs the action', async () => {
    const run = jest.fn();
    renderHeader(
      <DashboardAppHeader
        title="Dashboard"
        aiAction={createAiAction({
          run,
          tooltip: 'Open assistant',
          testId: 'dashboardAiAction',
        })}
      />
    );

    const button = await screen.findByRole('button', { name: 'Ask AI' });
    expect(button).toHaveTextContent('Ask AI');
    expect(button).toHaveAttribute('data-test-subj', 'dashboardAiAction');
    expect(button.closest('.euiToolTipAnchor')).toBeInTheDocument();

    fireEvent.click(button);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('disables the AI control and skips an inline tooltip when none is supplied', async () => {
    renderHeader(
      <DashboardAppHeader
        title="Dashboard"
        aiAction={createAiAction({ disabled: true, testId: 'dashboardAiAction' })}
      />
    );

    const button = await screen.findByRole('button', { name: 'Ask AI' });
    expect(button).toBeDisabled();
    expect(button.closest('.euiToolTipAnchor')).not.toBeInTheDocument();
  });

  it('renders an icon-only control with the same accessible name when collapsed', async () => {
    mockCurrentBreakpoint = 'xs';

    renderHeader(
      <DashboardAppHeader
        title="Dashboard"
        aiAction={createAiAction({ testId: 'dashboardAiAction' })}
      />
    );

    const button = await screen.findByRole('button', { name: 'Ask AI' });
    expect(button).toHaveAttribute('aria-label', 'Ask AI');
    expect(button).not.toHaveTextContent('Ask AI');
    expect(button.closest('.euiToolTipAnchor')).toBeInTheDocument();
  });

  it('claims the inline app-header slot and releases it on unmount', () => {
    const chrome = chromeServiceMock.createStartContract();
    const { unmount } = renderHeader(<DashboardAppHeader title="Dashboard" />, chrome);

    expect(chrome.next.inlineAppHeader.set).toHaveBeenCalledWith(true);

    unmount();

    expect(chrome.next.inlineAppHeader.set).toHaveBeenCalledWith(false);
  });
});
