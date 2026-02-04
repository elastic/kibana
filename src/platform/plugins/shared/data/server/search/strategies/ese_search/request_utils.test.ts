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
import type { IUiSettingsClient } from '@kbn/core/server';
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
    test('Uses `keep_alive` from default params if no `sessionId` is provided', async () => {
      const mockUiSettingsClient = getMockUiSettingsClient({
        [UI_SETTINGS.SEARCH_INCLUDE_FROZEN]: false,
      });
      const mockConfig = getMockSearchConfig({
        sessions: {
          defaultExpiration: moment.duration(3, 'd'),
        },
      });
      const params = await getDefaultAsyncSubmitParams(mockUiSettingsClient, mockConfig, {});
      expect(params).toHaveProperty('keep_alive', '60000ms');
    });

    test('Uses `keep_alive` from config if enabled and session is stored', async () => {
      const mockUiSettingsClient = getMockUiSettingsClient({
        [UI_SETTINGS.SEARCH_INCLUDE_FROZEN]: false,
      });
      const mockConfig = getMockSearchConfig({
        sessions: {
          defaultExpiration: moment.duration(3, 'd'),
        },
      });
      const params = await getDefaultAsyncSubmitParams(mockUiSettingsClient, mockConfig, {
        sessionId: 'foo',
        isStored: true,
      });
      expect(params).toHaveProperty('keep_alive', '259200000ms');
    });

    test('Uses `keepAlive` of `1m` if disabled', async () => {
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
      expect(params).toHaveProperty('keep_alive', '60000ms');
    });

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

    test('Sets `batched_reduce_size` and `ccs_minimize_roundtrips` for non serverless', async () => {
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

    test('Does not set `ccs_minimize_roundtrips` for serverless', async () => {
      const mockUiSettingsClient = getMockUiSettingsClient({
        [UI_SETTINGS.SEARCH_INCLUDE_FROZEN]: false,
      });
      const mockConfig = getMockSearchConfig({});
      const params = await getDefaultAsyncSubmitParams(
        mockUiSettingsClient,
        mockConfig,
        {},
        { isServerless: true }
      );
      expect(params).not.toHaveProperty('ccs_minimize_roundtrips');
    });

    test('Does not set `ccs_minimize_roundtrips` for PIT', async () => {
      const mockUiSettingsClient = getMockUiSettingsClient({
        [UI_SETTINGS.SEARCH_INCLUDE_FROZEN]: false,
      });
      const mockConfig = getMockSearchConfig({});
      const params = await getDefaultAsyncSubmitParams(
        mockUiSettingsClient,
        mockConfig,
        {},
        { isPit: true }
      );
      expect(params).not.toHaveProperty('ccs_minimize_roundtrips');
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

    test('Uses `keep_alive` if `sessionId` is not provided', async () => {
      const mockConfig = getMockSearchConfig({
        sessions: {
          defaultExpiration: moment.duration(3, 'd'),
          enabled: true,
        },
      });
      const params = getDefaultAsyncGetParams(mockConfig, {});
      expect(params).toHaveProperty('keep_alive', '60000ms');
    });

    test('Has no `keep_alive` if `sessionId` is provided and search already stored', async () => {
      const mockConfig = getMockSearchConfig({
        sessions: {
          defaultExpiration: moment.duration(3, 'd'),
          enabled: true,
        },
      });
      const params = getDefaultAsyncGetParams(mockConfig, {
        sessionId: 'foo',
        isStored: true,
        isSearchStored: true,
      });
      expect(params).not.toHaveProperty('keep_alive');
    });

    test('Uses `keep_alive` if `sessionId` is provided but sessions disabled', async () => {
      const mockConfig = getMockSearchConfig({
        sessions: {
          defaultExpiration: moment.duration(3, 'd'),
          enabled: false,
        },
      });
      const params = getDefaultAsyncGetParams(mockConfig, { sessionId: 'foo' });
      expect(params).toHaveProperty('keep_alive', '60000ms');
    });
  });
});
