/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  WorkdayActionParamsSchema,
  WorkdayConfigSchema,
  WorkdayGetWorkerParamsSchema,
  WorkdaySearchWorkersParamsSchema,
  WorkdaySecretsSchema,
} from './v1';
import { SUB_ACTION } from '../constants';

describe('workday schemas', () => {
  describe('WorkdayConfigSchema', () => {
    it('accepts apiUrl + tokenUrl', () => {
      expect(() =>
        WorkdayConfigSchema.parse({ apiUrl: 'https://a', tokenUrl: 'https://b' })
      ).not.toThrow();
    });
    it('rejects unknown fields', () => {
      expect(() =>
        WorkdayConfigSchema.parse({
          apiUrl: 'https://a',
          tokenUrl: 'https://b',
          extra: 'nope',
        })
      ).toThrow();
    });
  });

  describe('WorkdaySecretsSchema', () => {
    it('accepts clientId + clientSecret', () => {
      expect(() => WorkdaySecretsSchema.parse({ clientId: 'a', clientSecret: 'b' })).not.toThrow();
    });
  });

  describe('WorkdayGetWorkerParamsSchema', () => {
    it('requires workerId', () => {
      expect(() => WorkdayGetWorkerParamsSchema.parse({ workerId: 'abc' })).not.toThrow();
      expect(() => WorkdayGetWorkerParamsSchema.parse({ workerId: '' })).toThrow();
    });
  });

  describe('WorkdaySearchWorkersParamsSchema', () => {
    it('requires search of 3+ chars', () => {
      expect(() => WorkdaySearchWorkersParamsSchema.parse({ search: 'jan' })).not.toThrow();
      expect(() => WorkdaySearchWorkersParamsSchema.parse({ search: 'ja' })).toThrow();
    });
    it('rejects out-of-range limit', () => {
      expect(() => WorkdaySearchWorkersParamsSchema.parse({ search: 'jane', limit: 0 })).toThrow();
      expect(() =>
        WorkdaySearchWorkersParamsSchema.parse({ search: 'jane', limit: 101 })
      ).toThrow();
    });
  });

  describe('WorkdayActionParamsSchema', () => {
    it('accepts a getWorker action', () => {
      expect(() =>
        WorkdayActionParamsSchema.parse({
          subAction: SUB_ACTION.GET_WORKER,
          subActionParams: { workerId: 'abc' },
        })
      ).not.toThrow();
    });
    it('accepts a searchWorkers action', () => {
      expect(() =>
        WorkdayActionParamsSchema.parse({
          subAction: SUB_ACTION.SEARCH_WORKERS,
          subActionParams: { search: 'jane' },
        })
      ).not.toThrow();
    });
    it('rejects an unknown subAction', () => {
      expect(() =>
        WorkdayActionParamsSchema.parse({
          subAction: 'nope',
          subActionParams: {},
        })
      ).toThrow();
    });
  });
});
