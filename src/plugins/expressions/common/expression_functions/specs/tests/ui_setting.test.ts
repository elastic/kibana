/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('../../../../common');

import { IUiSettingsClient } from 'src/core/public';
import { getUiSettingsFactory } from '../../../../common';
import { uiSetting } from '../ui_setting';

describe('uiSetting', () => {
  describe('fn', () => {
    let uiSettings: jest.Mocked<IUiSettingsClient>;
    let uiSettingsFactory: jest.MockedFunction<ReturnType<typeof getUiSettingsFactory>>;

    beforeEach(() => {
      uiSettings = ({
        get: jest.fn(),
      } as unknown) as jest.Mocked<IUiSettingsClient>;
      uiSettingsFactory = (jest.fn(() => uiSettings) as unknown) as typeof uiSettingsFactory;

      (getUiSettingsFactory as jest.MockedFunction<typeof getUiSettingsFactory>).mockReturnValue(
        uiSettingsFactory
      );
    });

    it('should return a value', () => {
      uiSettings.get.mockReturnValueOnce('value');

      expect(uiSetting.fn(null, { parameter: 'something' }, {} as any)).resolves.toEqual({
        type: 'ui_setting',
        key: 'something',
        value: 'value',
      });
    });

    it('should pass a default value', async () => {
      await uiSetting.fn(null, { parameter: 'something', default: 'default' }, {} as any);

      expect(uiSettings.get).toHaveBeenCalledWith('something', 'default');
    });

    it('should throw an error when parameter does not exist', () => {
      uiSettings.get.mockImplementationOnce(() => {
        throw new Error();
      });

      expect(uiSetting.fn(null, { parameter: 'something' }, {} as any)).rejects.toEqual(
        new Error('Invalid parameter "something".')
      );
    });

    it('should get a request instance on the server-side', async () => {
      const request = {};
      await uiSetting.fn(null, { parameter: 'something' }, {
        getKibanaRequest: () => request,
      } as any);

      const [[{ getKibanaRequest }]] = uiSettingsFactory.mock.calls;

      expect(getKibanaRequest()).toBe(request);
    });

    it('should throw an error if request is not provided on the server-side', async () => {
      await uiSetting.fn(null, { parameter: 'something' }, {} as any);

      const [[{ getKibanaRequest }]] = uiSettingsFactory.mock.calls;

      expect(getKibanaRequest).toThrow();
    });
  });
});
