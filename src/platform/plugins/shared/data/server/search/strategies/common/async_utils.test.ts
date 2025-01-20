/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getCommonDefaultAsyncGetParams, getCommonDefaultAsyncSubmitParams } from './async_utils';
import moment from 'moment';
import { getMockSearchConfig } from '../../../../config.mock';

describe('request utils', () => {
  describe('getCommonDefaultAsyncSubmitParams', () => {
    test('Uses `keep_on_completion` if sessions enabled', async () => {
      const mockConfig = getMockSearchConfig({});
      const params = getCommonDefaultAsyncSubmitParams(mockConfig, {
        sessionId: 'foo',
      });
      expect(params).toHaveProperty('keep_on_completion', true);
    });

    test('Does not use `keep_on_completion` if sessions disabled', async () => {
      const mockConfig = getMockSearchConfig({
        sessions: {
          defaultExpiration: moment.duration(3, 'd'),
          enabled: false,
        },
      });
      const params = getCommonDefaultAsyncSubmitParams(mockConfig, {
        sessionId: 'foo',
      });
      expect(params).toHaveProperty('keep_on_completion', false);
    });
  });

  describe('getCommonDefaultAsyncGetParams', () => {
    test('Uses `wait_for_completion_timeout`', async () => {
      const mockConfig = getMockSearchConfig({
        sessions: {
          defaultExpiration: moment.duration(3, 'd'),
          enabled: true,
        },
      });
      const params = getCommonDefaultAsyncGetParams(mockConfig, {});
      expect(params).toHaveProperty('wait_for_completion_timeout');
    });
  });

  describe('overrides: force disable sessions', () => {
    test('Does not use `keep_on_completion` if sessions disabled through overrides', async () => {
      const mockConfig = getMockSearchConfig({
        sessions: {
          defaultExpiration: moment.duration(3, 'd'),
          enabled: true,
        },
      });
      const params = getCommonDefaultAsyncSubmitParams(
        mockConfig,
        {
          sessionId: 'foo',
        },
        { disableSearchSessions: true }
      );
      expect(params).toHaveProperty('keep_on_completion', false);
    });
  });
});
