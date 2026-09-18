/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ExportJsonFlyoutContent } from '@kbn/as-code-export-flyout-component';
import {
  DISCOVER_SESSION_API_ACCESS,
  DISCOVER_SESSION_API_BASE_PATH,
  DISCOVER_SESSION_API_VERSION,
} from '../../../../../../common/constants';
import type {
  DiscoverSessionApiData,
  DiscoverSessionSanitizeRequest,
} from '../../../../../../server';
import { ExportDiscoverSessionJsonFlyout } from './json_flyout';

type MockExportJsonFlyoutContentProps = React.ComponentProps<typeof ExportJsonFlyoutContent>;

const mockGetExportJson = jest.fn(
  (
    _exportCurrentTab: boolean,
    _includeCurrentTimeSettings: boolean
  ): DiscoverSessionSanitizeRequest => ({
    attributes: {
      title: 'Discover session',
      description: '',
      tabs: [],
    },
  })
);
const mockSanitizeExportJson = jest.fn(
  async (): Promise<{ data: DiscoverSessionApiData; warnings: readonly string[] }> => ({
    data: {
      title: 'Discover session',
      description: '',
      tabs: [],
    },
    warnings: ['An unsupported control panel was omitted.'],
  })
);
const mockDownloadFileAs = jest.fn();
const mockUseUrl = jest.fn(() => 'console-url');
const mockExportJsonFlyoutContent = jest.fn((_props: MockExportJsonFlyoutContentProps) => null);

jest.mock('@kbn/as-code-export-flyout-component', () => ({
  ExportJsonFlyoutContent: (props: MockExportJsonFlyoutContentProps) =>
    mockExportJsonFlyoutContent(props),
}));

jest.mock('@kbn/share-plugin/public', () => ({
  downloadFileAs: (...args: unknown[]) => mockDownloadFileAs(...args),
}));

describe('Discover export JSON flyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderFlyout = (showIncludeCurrentTimeSettings = true) =>
    render(
      <ExportDiscoverSessionJsonFlyout
        canShowDevTools
        closeFlyout={jest.fn()}
        getExportJson={mockGetExportJson}
        sanitizeExportJson={mockSanitizeExportJson}
        showIncludeCurrentTimeSettings={showIncludeCurrentTimeSettings}
        title="Discover session"
        useConsoleUrl={mockUseUrl}
      />
    );

  it('connects the shared flyout to the Discover state and download implementation', async () => {
    renderFlyout();

    const props = mockExportJsonFlyoutContent.mock.calls[0][0];

    expect(props).toEqual(
      expect.objectContaining({
        title: 'Discover session',
        objectType: 'Discover session',
        getExportJson: expect.any(Function),
        dataTestSubjPrefix: 'discover',
        isTechnicalPreview: true,
      })
    );

    await props.downloadExportJson('discover-session.json', '{}');

    await expect(props.prepareExportJson(props.getExportJson())).resolves.toEqual({
      data: {
        title: 'Discover session',
        description: '',
        tabs: [],
      },
      warnings: ['An unsupported control panel was omitted.'],
    });
    expect(mockSanitizeExportJson).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: expect.objectContaining({ title: 'Discover session' }),
      })
    );

    expect(mockDownloadFileAs).toHaveBeenCalledWith('discover-session.json', {
      content: '{}',
      type: 'application/json',
    });
  });

  it('configures the Discover Open in Console action', () => {
    renderFlyout();

    const { openInConsole } = mockExportJsonFlyoutContent.mock.calls[0][0];

    expect(openInConsole).toEqual(
      expect.objectContaining({
        canShow: true,
        useUrl: mockUseUrl,
      })
    );

    // Remove `apiVersion` from the Console request when the API becomes public.
    expect(DISCOVER_SESSION_API_ACCESS).toBe('internal');
    expect(openInConsole?.getRequest('{}')).toBe(
      `POST kbn:${DISCOVER_SESSION_API_BASE_PATH}?apiVersion=${DISCOVER_SESSION_API_VERSION}\n{}`
    );
  });

  it('exports the whole session by default and can export only the current tab', () => {
    renderFlyout();

    const initialProps = mockExportJsonFlyoutContent.mock.calls[0][0];

    render(<>{initialProps.headerActions}</>);
    initialProps.getExportJson();

    const exportCurrentTabSwitch = screen.getByTestId('discoverExportJsonCurrentTabSwitch');

    expect(screen.getByText('Export only the current tab')).toBeInTheDocument();
    expect(exportCurrentTabSwitch).not.toBeChecked();
    expect(mockGetExportJson).toHaveBeenLastCalledWith(false, false);

    fireEvent.click(exportCurrentTabSwitch);

    const updatedProps =
      mockExportJsonFlyoutContent.mock.calls[mockExportJsonFlyoutContent.mock.calls.length - 1][0];
    updatedProps.getExportJson();

    expect(mockGetExportJson).toHaveBeenLastCalledWith(true, false);
  });

  it('excludes current time settings by default and allows including them', () => {
    renderFlyout();

    const initialProps = mockExportJsonFlyoutContent.mock.calls[0][0];

    render(<>{initialProps.headerActions}</>);
    initialProps.getExportJson();

    const includeCurrentTimeSettingsSwitch = screen.getByTestId(
      'discoverExportJsonCurrentTimeSettingsSwitch'
    );

    expect(includeCurrentTimeSettingsSwitch).not.toBeChecked();
    expect(mockGetExportJson).toHaveBeenLastCalledWith(false, false);

    fireEvent.click(includeCurrentTimeSettingsSwitch);

    const updatedProps =
      mockExportJsonFlyoutContent.mock.calls[mockExportJsonFlyoutContent.mock.calls.length - 1][0];
    updatedProps.getExportJson();

    expect(mockGetExportJson).toHaveBeenLastCalledWith(false, true);
  });

  it('hides the current time settings toggle for a saved session', () => {
    renderFlyout(false);

    const props = mockExportJsonFlyoutContent.mock.calls[0][0];

    render(<>{props.headerActions}</>);

    expect(screen.queryByTestId('discoverExportJsonCurrentTimeSettingsSwitch')).toBeNull();
  });

  it('surfaces export errors through prepareExportJson', async () => {
    renderFlyout();

    const props = mockExportJsonFlyoutContent.mock.calls[0][0];

    mockSanitizeExportJson.mockRejectedValueOnce(new Error('Unable to sanitize Discover session'));

    await expect(props.prepareExportJson(props.getExportJson())).rejects.toThrow(
      'Unable to sanitize Discover session'
    );
  });
});
