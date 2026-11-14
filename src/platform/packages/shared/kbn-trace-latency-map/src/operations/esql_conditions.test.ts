/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FAILED_SPAN_CONDITION } from '../query/fields';
import { selectionToEsqlCondition } from '../selection/to_esql';
import { isOperationCondition, parseOperationCondition } from './from_esql';
import { operationToEsqlCondition } from './to_esql';

describe('operation conditions', () => {
  it('writes the service and the name in every family, and reads it back', () => {
    const operation = { service: 'cart', name: 'GET /cart' };
    const condition = operationToEsqlCondition(operation);
    expect(condition).toBe(
      'service.name == "cart" AND (transaction.name == "GET /cart" OR span.name == "GET /cart" OR name == "GET /cart")'
    );
    expect(parseOperationCondition(condition)).toEqual(operation);
    expect(isOperationCondition(condition)).toBe(true);
  });

  it('escapes quotes and backslashes in the names, and the round trip survives them', () => {
    const operation = { service: 'c"art\\', name: 'GET "/cart"' };
    const condition = operationToEsqlCondition(operation);
    expect(condition).toContain('service.name == "c\\"art\\\\"');
    expect(parseOperationCondition(condition)).toEqual(operation);
  });

  it('rejects a condition whose name literals differ: not one this package wrote', () => {
    expect(
      parseOperationCondition(
        'service.name == "cart" AND (transaction.name == "GET /a" OR span.name == "GET /b" OR name == "GET /a")'
      )
    ).toBeUndefined();
  });

  it('rejects hand-edited and foreign clauses, which stay ordinary filters', () => {
    expect(isOperationCondition('service.name == "cart"')).toBe(false);
    expect(isOperationCondition(FAILED_SPAN_CONDITION)).toBe(false);
    expect(
      isOperationCondition(
        selectionToEsqlCondition({
          from: '2026-10-26T10:00:00.000Z',
          to: '2026-10-26T10:05:00.000Z',
          minDuration: 1_000_000,
          maxDuration: 5_000_000,
        })
      )
    ).toBe(false);
  });
});
