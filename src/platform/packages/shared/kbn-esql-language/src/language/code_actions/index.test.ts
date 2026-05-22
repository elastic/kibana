/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLSourceResult } from '@kbn/esql-types';
import { SOURCES_TYPES } from '@kbn/esql-types';
import { getQuickFixForMessage } from '.';
import { fixesByMessageCode } from './fixes_by_message_code';

const wiredStreamSource = (name: string) =>
  ({ name, hidden: false, type: SOURCES_TYPES.WIRED_STREAM } as ESQLSourceResult);

const indexSource = (name: string) =>
  ({ name, hidden: false, type: SOURCES_TYPES.INDEX } as ESQLSourceResult);

describe('getQuickFixForMessage', () => {
  it('returns undefined when no quick fix is registered for the message code', async () => {
    const result = await getQuickFixForMessage({
      queryString: 'FROM logs | KEEP missingField',
      message: { code: 'notARegisteredCode' },
    });

    expect(result).toBeUndefined();
  });

  describe('unknownColumn', () => {
    it('returns undefined for unknownColumn when callbacks are omitted (display condition can not be checked)', async () => {
      const result = await getQuickFixForMessage({
        queryString: 'FROM logs.otel.child | KEEP missingField',
        message: { code: 'unknownColumn' },
      });

      expect(result).toBeUndefined();
    });

    it('returns undefined for unknownColumn when the query has no wired stream source', async () => {
      const getSources = jest.fn(async () => [indexSource('logs')]);

      const result = await getQuickFixForMessage({
        queryString: 'FROM logs | KEEP missingField',
        message: { code: 'unknownColumn' },
        callbacks: { getSources },
      });

      expect(result).toBeUndefined();
    });

    it('returns undefined for unknownColumn when getSources throws', async () => {
      const getSources = jest.fn(async () => {
        throw new Error('network');
      });

      const result = await getQuickFixForMessage({
        queryString: 'FROM logs.otel.child | KEEP missingField',
        message: { code: 'unknownColumn' },
        callbacks: { getSources },
      });

      expect(result).toBeUndefined();
    });

    it('returns a load-unmapped-fields quick fix for unknownColumn when a wired stream is in the query', async () => {
      const getSources = jest.fn(async () => [wiredStreamSource('logs.otel.child')]);

      const result = await getQuickFixForMessage({
        queryString: 'FROM logs.otel.child | KEEP missingField',
        message: { code: 'unknownColumn' },
        callbacks: { getSources },
      });

      expect(result).toBeDefined();
      if (result) {
        expect(result.title).toBe('Load unmapped fields');
        expect(result.fixedText).toBe(
          `SET unmapped_fields = "LOAD";\nFROM logs.otel.child\n  | KEEP missingField`
        );
      }
    });

    it('returns undefined when fixQuery throws', async () => {
      const { fixQuery } = fixesByMessageCode.unknownColumn!;
      fixesByMessageCode.unknownColumn!.fixQuery = () => {
        throw new Error('mutator failed');
      };

      const getSources = jest.fn(async () => [wiredStreamSource('logs.otel.child')]);

      try {
        const result = await getQuickFixForMessage({
          queryString: 'FROM logs.otel.child | KEEP missingField',
          message: { code: 'unknownColumn' },
          callbacks: { getSources },
        });

        expect(result).toBeUndefined();
      } finally {
        fixesByMessageCode.unknownColumn!.fixQuery = fixQuery;
      }
    });
  });
});
