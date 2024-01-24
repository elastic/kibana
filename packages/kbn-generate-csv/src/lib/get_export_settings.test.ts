/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IUiSettingsClient } from '@kbn/core/server';
import {
  loggingSystemMock,
  savedObjectsClientMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import type { ReportingConfigType } from '@kbn/reporting-server';

import {
  UI_SETTINGS_CSV_QUOTE_VALUES,
  UI_SETTINGS_CSV_SEPARATOR,
  UI_SETTINGS_DATEFORMAT_TZ,
  UI_SETTINGS_SEARCH_INCLUDE_FROZEN,
} from '../../constants';
import { getExportSettings } from './get_export_settings';

describe('getExportSettings', () => {
  let uiSettingsClient: IUiSettingsClient;
  let config: ReportingConfigType['csv'];
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    config = {
      checkForFormulas: true,
      escapeFormulaValues: false,
      maxSizeBytes: 180000,
      scroll: { size: 500, duration: '30s', strategy: 'pit' },
      useByteOrderMarkEncoding: false,
      maxConcurrentShardRequests: 5,
      enablePanelActionDownload: true,
    };

    uiSettingsClient = uiSettingsServiceMock
      .createStartContract()
      .asScopedToClient(savedObjectsClientMock.create());
    uiSettingsClient.get = jest.fn().mockImplementation((key: string) => {
      switch (key) {
        case UI_SETTINGS_CSV_QUOTE_VALUES:
          return true;
        case UI_SETTINGS_CSV_SEPARATOR:
          return ',';
        case UI_SETTINGS_DATEFORMAT_TZ:
          return 'Browser';
        case UI_SETTINGS_SEARCH_INCLUDE_FROZEN:
          return false;
      }

      return 'helo world';
    });
  });

  test('getExportSettings: returns the expected result', async () => {
    expect(await getExportSettings(uiSettingsClient, config, '', logger)).toMatchObject({
      bom: '',
      checkForFormulas: true,
      escapeFormulaValues: false,
      includeFrozen: false,
      maxConcurrentShardRequests: 5,
      maxSizeBytes: 180000,
      scroll: {
        duration: '30s',
        size: 500,
      },
      separator: ',',
      timezone: 'UTC',
    });
  });

  test('does not add a default scroll strategy', async () => {
    // @ts-expect-error undefined isn't allowed
    config = { ...config, scroll: { strategy: undefined } };
    expect(await getExportSettings(uiSettingsClient, config, '', logger)).toMatchObject(
      expect.objectContaining({ scroll: expect.objectContaining({ strategy: undefined }) })
    );
  });

  test('passes the scroll=pit strategy through', async () => {
    config = { ...config, scroll: { ...config.scroll, strategy: 'pit' } };

    expect(await getExportSettings(uiSettingsClient, config, '', logger)).toMatchObject(
      expect.objectContaining({ scroll: expect.objectContaining({ strategy: 'pit' }) })
    );
  });

  test('passes the scroll=scroll strategy through', async () => {
    config = { ...config, scroll: { ...config.scroll, strategy: 'scroll' } };

    expect(await getExportSettings(uiSettingsClient, config, '', logger)).toMatchObject(
      expect.objectContaining({
        scroll: expect.objectContaining({
          strategy: 'scroll',
        }),
      })
    );
  });

  test('escapeValue function', async () => {
    const { escapeValue } = await getExportSettings(uiSettingsClient, config, '', logger);
    expect(escapeValue(`test`)).toBe(`test`);
    expect(escapeValue(`this is, a test`)).toBe(`"this is, a test"`);
    expect(escapeValue(`"tet"`)).toBe(`"""tet"""`);
    expect(escapeValue(`@foo`)).toBe(`"@foo"`);
  });

  test('non-default timezone', async () => {
    uiSettingsClient.get = jest.fn().mockImplementation((key: string) => {
      switch (key) {
        case UI_SETTINGS_DATEFORMAT_TZ:
          return `America/Aruba`;
      }
    });

    expect(
      await getExportSettings(uiSettingsClient, config, '', logger).then(({ timezone }) => timezone)
    ).toBe(`America/Aruba`);
  });
});
