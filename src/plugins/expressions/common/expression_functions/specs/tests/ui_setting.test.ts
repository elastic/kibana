/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('../../../../common');

import { IUiSettingsClient } from 'src/core/public';
import { getUiSettings } from '../../../../common';
import { uiSetting } from '../ui_setting';

describe('uiSetting', () => {
  describe('fn', () => {
    let uiSettings: jest.Mocked<IUiSettingsClient>;

    beforeEach(() => {
      uiSettings = ({
        get: jest.fn(),
      } as unknown) as jest.Mocked<IUiSettingsClient>;

      (getUiSettings as jest.MockedFunction<typeof getUiSettings>).mockReturnValue(uiSettings);
    });

    it('should return a value', () => {
      uiSettings.get.mockReturnValueOnce('value');

      expect(uiSetting.fn(null, { parameter: 'something' }, {} as any)).toEqual({
        type: 'ui_setting',
        key: 'something',
        value: 'value',
      });
    });

    it('should pass a default value', () => {
      uiSetting.fn(null, { parameter: 'something', default: 'default' }, {} as any);

      expect(uiSettings.get).toHaveBeenCalledWith('something', 'default');
    });

    it('should throw an error when parameter does not exist', () => {
      uiSettings.get.mockImplementationOnce(() => {
        throw new Error();
      });
      expect(() => uiSetting.fn(null, { parameter: 'something' }, {} as any)).toThrowError(
        'Invalid parameter "something".'
      );
    });
  });
});
