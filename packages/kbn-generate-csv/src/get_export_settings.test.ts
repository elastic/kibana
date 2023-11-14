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
} from './constants';
import { getExportSettings } from './get_export_settings';

describe('getExportSettings', () => {
  let uiSettingsClient: IUiSettingsClient;
  const config: ReportingConfigType['csv'] = {
    checkForFormulas: true,
    escapeFormulaValues: false,
    maxSizeBytes: 180000,
    scroll: { size: 500, duration: '30s' },
    useByteOrderMarkEncoding: false,
    enablePanelActionDownload: true,
  };
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
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
    expect(await getExportSettings(uiSettingsClient, config, '', logger)).toMatchInlineSnapshot(`
      Object {
        "bom": "",
        "checkForFormulas": true,
        "escapeFormulaValues": false,
        "escapeValue": [Function],
        "includeFrozen": false,
        "maxSizeBytes": 180000,
        "scroll": Object {
          "duration": "30s",
          "size": 500,
        },
        "separator": ",",
        "timezone": "UTC",
      }
    `);
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
