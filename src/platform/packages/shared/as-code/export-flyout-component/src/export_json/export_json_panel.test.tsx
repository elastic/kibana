/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { compressToEncodedURIComponent } from 'lz-string';
import React from 'react';

import '@kbn/code-editor-mock/jest_helper';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { ExportJsonPanel } from './export_json_panel';
import type { ExportJsonPreparedState, UseConsoleUrl } from './types';

describe('ExportJsonPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading indicator while loading', async () => {
    const preparedState: ExportJsonPreparedState<{}> = {
      status: 'loading',
      data: undefined,
      warnings: [],
      error: undefined,
    };
    render(<ExportJsonPanel {...preparedState} dataTestSubjPrefix="test" onRetry={jest.fn()} />);
    expect(screen.getByTestId('testExportSourceLoading')).toBeInTheDocument();
  });

  it('renders warnings when the server reports unsupported panels', async () => {
    const user = userEvent.setup();
    const preparedState: ExportJsonPreparedState<{}> = {
      status: 'success',
      data: {},
      warnings: ['Dropped panel panel1, panel schema not available for panel type: foo.'],
      error: undefined,
    };

    render(<ExportJsonPanel {...preparedState} dataTestSubjPrefix="test" onRetry={jest.fn()} />);

    expect(screen.getByTestId('testExportSourceWarnings')).toBeInTheDocument();

    expect(screen.queryByTestId('testExportSourceWarningsList')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Show details/i }));
    expect(screen.getByTestId('testExportSourceWarningsList')).toBeInTheDocument();
    expect(screen.getByText(/Dropped panel panel1/)).toBeInTheDocument();

    const callout = screen.getByTestId('testExportSourceWarnings');
    await user.click(within(callout).getByTestId('euiDismissCalloutButton'));
    expect(screen.queryByTestId('testExportSourceWarnings')).not.toBeInTheDocument();
    expect(screen.getByTestId('exportAssetValue')).toBeInTheDocument();
  });

  it('renders Open in Console using the consumer request', () => {
    const preparedState: ExportJsonPreparedState<{ key: string }> = {
      status: 'success',
      data: { key: 'value' },
      warnings: [],
      error: undefined,
    };
    const jsonValue = '{\n  "key": "value"\n}';
    const request = `POST kbn:/api/object\n${jsonValue}`;
    const devToolsDataUri = compressToEncodedURIComponent(request);
    const getRequest = jest.fn(() => request);
    const useUrl = jest.fn<ReturnType<UseConsoleUrl>, Parameters<UseConsoleUrl>>(
      () => '/app/dev_tools'
    );

    render(
      <ExportJsonPanel
        {...preparedState}
        dataTestSubjPrefix="test"
        onRetry={jest.fn()}
        openInConsole={{
          canShow: true,
          getRequest,
          useUrl,
        }}
      />
    );

    expect(getRequest).toHaveBeenCalledWith(jsonValue);
    expect(useUrl).toHaveBeenCalledWith(expect.any(Function), [devToolsDataUri]);
    expect(useUrl.mock.calls[0][0]()).toEqual({
      id: 'CONSOLE_APP_LOCATOR',
      params: {
        loadFrom: `data:text/plain,${devToolsDataUri}`,
      },
    });
    expect(screen.getByTestId('testExportSourceOpenInConsoleButton')).toHaveAttribute(
      'href',
      '/app/dev_tools'
    );
    expect(screen.getByRole('link', { name: 'Open in Console' })).toHaveAttribute(
      'target',
      '_blank'
    );
  });

  it('renders an error prompt and hides prepared JSON', async () => {
    const preparedState: ExportJsonPreparedState<{}> = {
      status: 'error',
      data: undefined,
      warnings: [],
      error: new Error('boom'),
    };
    render(<ExportJsonPanel {...preparedState} dataTestSubjPrefix="test" onRetry={jest.fn()} />);

    expect(screen.getByTestId('testExportSourcePrepareErrorPrompt')).toBeInTheDocument();

    expect(screen.getByText(/boom/)).toBeInTheDocument();
    expect(screen.queryByTestId('exportAssetValue')).not.toBeInTheDocument();
  });

  it('calls onRetry when the user clicks Retry', async () => {
    const user = userEvent.setup();
    const onRetry = jest.fn();
    const preparedState: ExportJsonPreparedState<{}> = {
      status: 'error',
      data: undefined,
      warnings: [],
      error: new Error('boom'),
    };

    render(<ExportJsonPanel {...preparedState} dataTestSubjPrefix="test" onRetry={onRetry} />);

    await user.click(screen.getByTestId('testExportSourceRetryButton'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
