/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getDefaultAsyncSubmitParams,
  getDefaultAsyncGetParams,
  getIgnoreThrottled,
} from './request_utils';
import { IUiSettingsClient } from '@kbn/core/server';
import { UI_SETTINGS } from '../../../../common';
import moment from 'moment';
import { getMockSearchConfig } from '../../../../config.mock';

const getMockUiSettingsClient = (config: Record<string, unknown>) => {
  return { get: async (key: string) => config[key] } as IUiSettingsClient;
};

describe('request utils', () => {
  describe('getIgnoreThrottled', () => {
    test('does not return `ignore_throttled` when `includeFrozen` is `false`', async () => {
      const mockUiSettingsClient = getMockUiSettingsClient({
        [UI_SETTINGS.SEARCH_INCLUDE_FROZEN]: false,
      });
      const result = await getIgnoreThrottled(mockUiSettingsClient);
      expect(result).not.toHaveProperty('ignore_throttled');
    });

    test('returns `ignore_throttled` as `false` when `includeFrozen` is `true`', async () => {
      const mockUiSettingsClient = getMockUiSettingsClient({
        [UI_SETTINGS.SEARCH_INCLUDE_FROZEN]: true,
      });
      const result = await getIgnoreThrottled(mockUiSettingsClient);
      expect(result.ignore_throttled).toBe(false);
    });
  });

  describe('getDefaultAsyncSubmitParams', () => {
    test('Uses `keep_on_completion` if enabled', async () => {
      const mockUiSettingsClient = getMockUiSettingsClient({
        [UI_SETTINGS.SEARCH_INCLUDE_FROZEN]: false,
      });
      const mockConfig = getMockSearchConfig({});
      const params = await getDefaultAsyncSubmitParams(mockUiSettingsClient, mockConfig, {
        sessionId: 'foo',
      });
      expect(params).toHaveProperty('keep_on_completion', true);
    });

    test('Does not use `keep_on_completion` if disabled', async () => {
      const mockUiSettingsClient = getMockUiSettingsClient({
        [UI_SETTINGS.SEARCH_INCLUDE_FROZEN]: false,
      });
      const mockConfig = getMockSearchConfig({
        sessions: {
          defaultExpiration: moment.duration(3, 'd'),
          enabled: false,
        },
      });
      const params = await getDefaultAsyncSubmitParams(mockUiSettingsClient, mockConfig, {
        sessionId: 'foo',
      });
      expect(params).toHaveProperty('keep_on_completion', false);
    });

    test('Sets `batched_reduce_size` and `ccs_minimize_roundtrips`', async () => {
      const mockUiSettingsClient = getMockUiSettingsClient({
        [UI_SETTINGS.SEARCH_INCLUDE_FROZEN]: false,
      });
      const batchedReduceSize = Math.floor(Math.random() * 64);
      const mockConfig = getMockSearchConfig({
        asyncSearch: { batchedReduceSize },
      });
      const params = await getDefaultAsyncSubmitParams(mockUiSettingsClient, mockConfig, {});
      expect(params).toHaveProperty('batched_reduce_size', batchedReduceSize);
      expect(params).toHaveProperty('ccs_minimize_roundtrips', true);
    });
  });

  describe('getDefaultAsyncGetParams', () => {
    test('Uses `wait_for_completion_timeout`', async () => {
      const mockConfig = getMockSearchConfig({
        sessions: {
          defaultExpiration: moment.duration(3, 'd'),
          enabled: true,
        },
      });
      const params = getDefaultAsyncGetParams(mockConfig, {});
      expect(params).toHaveProperty('wait_for_completion_timeout');
    });
  });
});
