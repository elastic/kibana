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
import type { DiscoverSessionApiData } from '../../../../../../server';
import { createExportJsonConfig } from './export_json_config';

type MockExportJsonFlyoutContentProps = React.ComponentProps<typeof ExportJsonFlyoutContent>;

const mockGetExportJson = jest.fn(
  (_exportAllTabs?: boolean): { data: DiscoverSessionApiData; warnings: readonly string[] } => ({
    data: {
      title: 'Discover session',
      description: '',
      tabs: [],
    },
    warnings: ['An unsupported chart interval was omitted.'],
  })
);
const mockDownloadFileAs = jest.fn();
const mockUseUrl = jest.fn(() => 'console-url');
const mockExportJsonFlyoutContent = jest.fn((_props: MockExportJsonFlyoutContentProps) => null);
const exportJsonConfig = createExportJsonConfig({
  canShowDevTools: true,
  objectType: 'Discover session',
  sharingData: {
    getExportJson: mockGetExportJson,
    locatorParams: [],
    title: 'Discover session',
  },
  useConsoleUrl: mockUseUrl,
});

jest.mock('@kbn/as-code-export-flyout-component', () => ({
  ExportJsonFlyoutContent: (props: MockExportJsonFlyoutContentProps) =>
    mockExportJsonFlyoutContent(props),
}));

jest.mock('@kbn/share-plugin/public', () => ({
  downloadFileAs: (...args: unknown[]) => mockDownloadFileAs(...args),
}));

describe('Discover export JSON config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('connects the shared flyout to the Discover state and download implementation', async () => {
    const FlyoutContent = exportJsonConfig.flyoutContent;

    render(<FlyoutContent closeFlyout={jest.fn()} flyoutRef={{ current: null }} />);

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
      warnings: ['An unsupported chart interval was omitted.'],
    });

    expect(mockDownloadFileAs).toHaveBeenCalledWith('discover-session.json', {
      content: '{}',
      type: 'application/json',
    });
  });

  it('configures the Discover Open in Console action', () => {
    const FlyoutContent = exportJsonConfig.flyoutContent;

    render(<FlyoutContent closeFlyout={jest.fn()} flyoutRef={{ current: null }} />);

    const { openInConsole } = mockExportJsonFlyoutContent.mock.calls[0][0];

    expect(openInConsole).toEqual(
      expect.objectContaining({
        canShow: true,
        useUrl: mockUseUrl,
      })
    );
    expect(openInConsole?.getRequest('{}')).toBe('POST kbn:/api/discover_sessions\n{}');
  });

  it('exports all tabs by default and can export only the current tab', async () => {
    const FlyoutContent = exportJsonConfig.flyoutContent;

    render(<FlyoutContent closeFlyout={jest.fn()} flyoutRef={{ current: null }} />);

    const initialProps = mockExportJsonFlyoutContent.mock.calls[0][0];

    render(<>{initialProps.headerActions}</>);
    await initialProps.prepareExportJson(initialProps.getExportJson());

    const exportAllTabsSwitch = screen.getByRole('switch');

    expect(screen.getByText('Export all tabs')).toBeInTheDocument();
    expect(exportAllTabsSwitch).toBeChecked();
    expect(mockGetExportJson).toHaveBeenLastCalledWith(true);

    fireEvent.click(exportAllTabsSwitch);

    const updatedProps =
      mockExportJsonFlyoutContent.mock.calls[mockExportJsonFlyoutContent.mock.calls.length - 1][0];
    await updatedProps.prepareExportJson(updatedProps.getExportJson());

    expect(mockGetExportJson).toHaveBeenLastCalledWith(false);
  });

  it('surfaces export errors through prepareExportJson', async () => {
    const FlyoutContent = exportJsonConfig.flyoutContent;

    render(<FlyoutContent closeFlyout={jest.fn()} flyoutRef={{ current: null }} />);

    const props = mockExportJsonFlyoutContent.mock.calls[0][0];

    mockGetExportJson.mockImplementationOnce(() => {
      throw new Error('Unsupported Discover control type: rangeSlider');
    });

    await expect(props.prepareExportJson(props.getExportJson())).rejects.toThrow(
      'Unsupported Discover control type: rangeSlider'
    );
  });
});
