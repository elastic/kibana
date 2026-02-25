/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isValidElement } from 'react';

jest.mock('./download_as', () => ({
  downloadFileAs: jest.fn(),
}));

describe('createAsCodeExportShareIntegration', () => {
  const jsonFormat = {
    label: 'JSON',
    fileExtension: 'json',
    mimeType: 'application/json',
    codeLanguage: 'json' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds a flyout config with copy + download behavior', async () => {
    const { createAsCodeExportShareIntegration } = await import('./as_code_export_integration');
    const { downloadFileAs } = await import('./download_as');

    const integration = createAsCodeExportShareIntegration<{ title: string; value: string }>({
      id: 'testAsCode',
      exportType: 'test_export_type',
      label: 'Export source (JSON)',
      format: jsonFormat,
      getFilenameBase: ({ title }) => title,
      getContent: ({ value }, { optimizedForPrinting }) =>
        optimizedForPrinting ? `${value}-print` : `${value}-screen`,
      copyAsset: {
        headingText: 'Heading',
        helpText: 'Help',
      },
      download: {
        buttonLabel: 'Download JSON',
      },
    });

    const config = await integration.getShareIntegrationConfig({
      sharingData: { title: 'My export', value: 'BODY' },
    } as any);

    expect(config.copyAssetURIConfig).toBeUndefined();
    expect(isValidElement(config.generateAssetComponent)).toBe(true);
    expect(typeof (config.generateAssetComponent as any).props.getValue).toBe('function');
    expect((config.generateAssetComponent as any).props.getValue({} as any)).toBe('BODY-screen');

    await config.generateAssetExport({ intl: {} as any, optimizedForPrinting: true });

    expect(downloadFileAs).toHaveBeenCalledWith('My export.json', {
      content: 'BODY-print',
      type: 'application/json',
    });
    expect(config.generateExportButtonLabel).toBe('Download JSON');
  });

  it('sanitizes filenames and normalizes extensions', async () => {
    const { createAsCodeExportShareIntegration } = await import('./as_code_export_integration');
    const { downloadFileAs } = await import('./download_as');

    const integration = createAsCodeExportShareIntegration<{ title: string }>({
      id: 'testAsCode',
      exportType: 'test_export_type',
      label: 'Export source (JSON)',
      format: jsonFormat,
      getFilenameBase: ({ title }) => title,
      getContent: () => 'BODY',
      copyAsset: {
        headingText: 'Heading',
      },
    });

    const config = await integration.getShareIntegrationConfig({
      sharingData: { title: 'My:Dash/board?*' },
    } as any);

    expect(config.copyAssetURIConfig).toBeUndefined();
    await config.generateAssetExport({ intl: {} as any, optimizedForPrinting: false });

    expect(downloadFileAs).toHaveBeenCalledWith('My_Dash_board__.json', {
      content: 'BODY',
      type: 'application/json',
    });
  });
});

