/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IUiSettingsClient } from '@kbn/core/server';
import {
  loggingSystemMock,
  savedObjectsClientMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import type { ReportingConfigType } from '@kbn/reporting-server';
import type { TaskInstanceFields } from '@kbn/reporting-common/types';

import {
  UI_SETTINGS_CSV_QUOTE_VALUES,
  UI_SETTINGS_CSV_SEPARATOR,
  UI_SETTINGS_DATEFORMAT_TZ,
  UI_SETTINGS_SEARCH_INCLUDE_FROZEN,
} from '../../constants';
import { getExportSettings } from './get_export_settings';
import moment from 'moment';

describe('getExportSettings', () => {
  let uiSettingsClient: IUiSettingsClient;
  let config: ReportingConfigType['csv'];
  let taskInstanceFields: TaskInstanceFields;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    config = {
      checkForFormulas: true,
      escapeFormulaValues: false,
      maxSizeBytes: 180000,
      scroll: { size: 500, duration: '30s', strategy: 'pit' },
      useByteOrderMarkEncoding: false,
      maxConcurrentShardRequests: 5,
    };

    taskInstanceFields = { startedAt: null, retryAt: null };

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

      return 'hello world';
    });
  });

  test('getExportSettings: returns the expected result', async () => {
    expect(await getExportSettings(uiSettingsClient, taskInstanceFields, config, '', logger))
      .toMatchInlineSnapshot(`
      Object {
        "bom": "",
        "checkForFormulas": true,
        "escapeFormulaValues": false,
        "escapeValue": [Function],
        "includeFrozen": false,
        "maxConcurrentShardRequests": 5,
        "maxSizeBytes": 180000,
        "scroll": Object {
          "duration": [Function],
          "size": 500,
          "strategy": "pit",
        },
        "separator": ",",
        "taskInstanceFields": Object {
          "retryAt": null,
          "startedAt": null,
        },
        "timezone": "UTC",
      }
    `);
  });

  test('does not add a default scroll strategy', async () => {
    // @ts-expect-error undefined isn't allowed
    config = { ...config, scroll: { strategy: undefined } };
    expect(
      await getExportSettings(uiSettingsClient, taskInstanceFields, config, '', logger)
    ).toMatchObject(
      expect.objectContaining({ scroll: expect.objectContaining({ strategy: undefined }) })
    );
  });

  test('passes the scroll=pit strategy through', async () => {
    config = { ...config, scroll: { ...config.scroll, strategy: 'pit' } };

    expect(
      await getExportSettings(uiSettingsClient, taskInstanceFields, config, '', logger)
    ).toMatchObject(
      expect.objectContaining({ scroll: expect.objectContaining({ strategy: 'pit' }) })
    );
  });

  test('passes the scroll=scroll strategy through', async () => {
    config = { ...config, scroll: { ...config.scroll, strategy: 'scroll' } };

    expect(
      await getExportSettings(uiSettingsClient, taskInstanceFields, config, '', logger)
    ).toMatchObject(
      expect.objectContaining({
        scroll: expect.objectContaining({
          strategy: 'scroll',
        }),
      })
    );
  });

  test('escapeValue function', async () => {
    const { escapeValue } = await getExportSettings(
      uiSettingsClient,
      taskInstanceFields,
      config,
      '',
      logger
    );
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
      await getExportSettings(uiSettingsClient, taskInstanceFields, config, '', logger).then(
        ({ timezone }) => timezone
      )
    ).toBe(`America/Aruba`);
  });

  describe('scroll duration function', () => {
    let spiedDateNow: jest.Spied<typeof Date.now>;
    let mockedTaskInstanceFields: TaskInstanceFields;
    const durationApart: { minutes: number } = { minutes: 5 };

    beforeEach(() => {
      const now = Date.now();

      // freeze time for test
      spiedDateNow = jest.spyOn(Date, 'now').mockReturnValue(now);

      mockedTaskInstanceFields = {
        startedAt: moment().subtract(durationApart).toDate(),
        retryAt: moment().add(durationApart).toDate(),
      };
    });

    afterEach(() => {
      spiedDateNow.mockRestore();
    });

    it('returns its specified value when value is not auto', async () => {
      const { scroll } = await getExportSettings(
        uiSettingsClient,
        taskInstanceFields,
        config,
        '',
        logger
      );

      expect(scroll.duration(mockedTaskInstanceFields)).toBe(config.scroll.duration);
    });

    it('throws when the scroll duration config is auto and retryAt value of the taskInstanceField passed is falsy', async () => {
      const configWithScrollAutoDuration = {
        ...config,
        scroll: {
          ...config.scroll,
          duration: 'auto',
        },
      };

      const { scroll } = await getExportSettings(
        uiSettingsClient,
        taskInstanceFields,
        configWithScrollAutoDuration,
        '',
        logger
      );

      expect(
        scroll.duration.bind(null, { startedAt: new Date(Date.now()), retryAt: null })
      ).toThrow();
    });

    it('returns a value that is the difference of the current time from the value of retryAt provided in the passed taskInstanceFields', async () => {
      const configWithScrollAutoDuration = {
        ...config,
        scroll: {
          ...config.scroll,
          duration: 'auto',
        },
      };

      const { scroll } = await getExportSettings(
        uiSettingsClient,
        taskInstanceFields,
        configWithScrollAutoDuration,
        '',
        logger
      );

      expect(scroll.duration(mockedTaskInstanceFields)).toBe(
        `${durationApart.minutes! * 60 * 1000}ms`
      );
    });

    it('returns 0 if current time exceeds the value of retryAt provided in the passed taskInstanceFields', async () => {
      const configWithScrollAutoDuration = {
        ...config,
        scroll: {
          ...config.scroll,
          duration: 'auto',
        },
      };

      spiedDateNow.mockReturnValue(
        moment(mockedTaskInstanceFields.retryAt!).add(durationApart).toDate().getTime()
      );

      const { scroll } = await getExportSettings(
        uiSettingsClient,
        taskInstanceFields,
        configWithScrollAutoDuration,
        '',
        logger
      );

      expect(scroll.duration(mockedTaskInstanceFields)).toBe('0ms');
    });
  });
});
