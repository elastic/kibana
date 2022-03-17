/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getDefaultAsyncSubmitParams, getDefaultAsyncGetParams } from './request_utils';
import moment from 'moment';
import { SearchSessionsConfigSchema } from '../../../../config';

const getMockSearchSessionsConfig = ({
  enabled = true,
  defaultExpiration = moment.duration(7, 'd'),
} = {}) =>
  ({
    enabled,
    defaultExpiration,
  } as SearchSessionsConfigSchema);

describe('request utils', () => {
  describe('getDefaultAsyncSubmitParams', () => {
    test('Uses `keep_alive` from default params if no `sessionId` is provided', async () => {
      const mockConfig = getMockSearchSessionsConfig({
        defaultExpiration: moment.duration(3, 'd'),
      });
      const params = getDefaultAsyncSubmitParams(mockConfig, {});
      expect(params).toHaveProperty('keep_alive', '1m');
    });

    test('Uses `keep_alive` from config if enabled', async () => {
      const mockConfig = getMockSearchSessionsConfig({
        defaultExpiration: moment.duration(3, 'd'),
      });
      const params = getDefaultAsyncSubmitParams(mockConfig, {
        sessionId: 'foo',
      });
      expect(params).toHaveProperty('keep_alive', '259200000ms');
    });

    test('Uses `keepAlive` of `1m` if disabled', async () => {
      const mockConfig = getMockSearchSessionsConfig({
        defaultExpiration: moment.duration(3, 'd'),
        enabled: false,
      });
      const params = getDefaultAsyncSubmitParams(mockConfig, {
        sessionId: 'foo',
      });
      expect(params).toHaveProperty('keep_alive', '1m');
    });

    test('Uses `keep_on_completion` if enabled', async () => {
      const mockConfig = getMockSearchSessionsConfig({});
      const params = getDefaultAsyncSubmitParams(mockConfig, {
        sessionId: 'foo',
      });
      expect(params).toHaveProperty('keep_on_completion', true);
    });

    test('Does not use `keep_on_completion` if disabled', async () => {
      const mockConfig = getMockSearchSessionsConfig({
        defaultExpiration: moment.duration(3, 'd'),
        enabled: false,
      });
      const params = getDefaultAsyncSubmitParams(mockConfig, {
        sessionId: 'foo',
      });
      expect(params).toHaveProperty('keep_on_completion', false);
    });
  });

  describe('getDefaultAsyncGetParams', () => {
    test('Uses `wait_for_completion_timeout`', async () => {
      const mockConfig = getMockSearchSessionsConfig({
        defaultExpiration: moment.duration(3, 'd'),
        enabled: true,
      });
      const params = getDefaultAsyncGetParams(mockConfig, {});
      expect(params).toHaveProperty('wait_for_completion_timeout');
    });

    test('Uses `keep_alive` if `sessionId` is not provided', async () => {
      const mockConfig = getMockSearchSessionsConfig({
        defaultExpiration: moment.duration(3, 'd'),
        enabled: true,
      });
      const params = getDefaultAsyncGetParams(mockConfig, {});
      expect(params).toHaveProperty('keep_alive', '1m');
    });

    test('Has no `keep_alive` if `sessionId` is provided', async () => {
      const mockConfig = getMockSearchSessionsConfig({
        defaultExpiration: moment.duration(3, 'd'),
        enabled: true,
      });
      const params = getDefaultAsyncGetParams(mockConfig, { sessionId: 'foo' });
      expect(params).not.toHaveProperty('keep_alive');
    });

    test('Uses `keep_alive` if `sessionId` is provided but sessions disabled', async () => {
      const mockConfig = getMockSearchSessionsConfig({
        defaultExpiration: moment.duration(3, 'd'),
        enabled: false,
      });
      const params = getDefaultAsyncGetParams(mockConfig, { sessionId: 'foo' });
      expect(params).toHaveProperty('keep_alive', '1m');
    });
  });
});
