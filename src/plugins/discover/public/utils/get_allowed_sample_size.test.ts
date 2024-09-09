/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SAMPLE_SIZE_SETTING } from '@kbn/discover-utils';
import { getAllowedSampleSize, getMaxAllowedSampleSize } from './get_allowed_sample_size';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';

describe('allowed sample size', () => {
  function getUiSettingsMock(sampleSize?: number): IUiSettingsClient {
    return {
      get: (key: string) => {
        if (key === SAMPLE_SIZE_SETTING) {
          return sampleSize;
        }
      },
    } as IUiSettingsClient;
  }

  const uiSettings = getUiSettingsMock(500);

  describe('getAllowedSampleSize', function () {
    test('should work correctly for a valid input', function () {
      expect(getAllowedSampleSize(1, uiSettings)).toBe(1);
      expect(getAllowedSampleSize(100, uiSettings)).toBe(100);
      expect(getAllowedSampleSize(500, uiSettings)).toBe(500);
    });

    test('should work correctly for an invalid input', function () {
      expect(getAllowedSampleSize(-10, uiSettings)).toBe(500);
      expect(getAllowedSampleSize(undefined, uiSettings)).toBe(500);
      expect(getAllowedSampleSize(50_000, uiSettings)).toBe(500);
    });
  });

  describe('getMaxAllowedSampleSize', function () {
    test('should work correctly', function () {
      expect(getMaxAllowedSampleSize(uiSettings)).toBe(500);
      expect(getMaxAllowedSampleSize(getUiSettingsMock(1000))).toBe(1000);
      expect(getMaxAllowedSampleSize(getUiSettingsMock(100))).toBe(100);
      expect(getMaxAllowedSampleSize(getUiSettingsMock(20_000))).toBe(10_000);
      expect(getMaxAllowedSampleSize(getUiSettingsMock(undefined))).toBe(500);
    });
  });
});
