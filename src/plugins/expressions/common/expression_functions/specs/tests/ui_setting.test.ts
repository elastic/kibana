/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('../../..');

import { IUiSettingsClient } from '@kbn/core/public';
import { getUiSettingFn } from '../ui_setting';
import { functionWrapper } from './utils';

describe('uiSetting', () => {
  describe('fn', () => {
    let getStartDependencies: jest.MockedFunction<
      Parameters<typeof getUiSettingFn>[0]['getStartDependencies']
    >;
    const uiSettingWrapper = () => functionWrapper(getUiSettingFn({ getStartDependencies }));
    let uiSetting: ReturnType<typeof uiSettingWrapper>;
    let uiSettings: jest.Mocked<IUiSettingsClient>;

    beforeEach(() => {
      uiSettings = {
        get: jest.fn(),
      } as unknown as jest.Mocked<IUiSettingsClient>;
      getStartDependencies = jest.fn(async () => ({
        uiSettings,
      })) as unknown as typeof getStartDependencies;

      uiSetting = uiSettingWrapper();
    });

    it('should return a value', () => {
      uiSettings.get.mockReturnValueOnce('value');

      expect(uiSetting(null, { parameter: 'something' })).resolves.toEqual({
        type: 'ui_setting',
        key: 'something',
        value: 'value',
      });
    });

    it('should pass a default value', async () => {
      await uiSetting(null, { parameter: 'something', default: 'default' });

      expect(uiSettings.get).toHaveBeenCalledWith('something', 'default');
    });

    it('should throw an error when parameter does not exist', () => {
      uiSettings.get.mockImplementationOnce(() => {
        throw new Error();
      });

      expect(uiSetting(null, { parameter: 'something' })).rejects.toEqual(
        new Error('Invalid parameter "something".')
      );
    });

    it('should get a request instance on the server-side', async () => {
      const request = {};
      await uiSetting(null, { parameter: 'something' }, {
        getKibanaRequest: () => request,
      } as Parameters<typeof uiSetting>[2]);

      const [[getKibanaRequest]] = getStartDependencies.mock.calls;

      expect(getKibanaRequest()).toBe(request);
    });

    it('should throw an error if request is not provided on the server-side', async () => {
      await uiSetting(null, { parameter: 'something' });

      const [[getKibanaRequest]] = getStartDependencies.mock.calls;

      expect(getKibanaRequest).toThrow();
    });
  });
});
