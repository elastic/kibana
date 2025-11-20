/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import {
  appendIndexToJoinCommandByName,
  appendIndexToJoinCommandByPosition,
} from './append_index_to_join_command';

describe('appendIndexToJoinCommandByName', () => {
  it('replaces existing index argument', () => {
    const result = appendIndexToJoinCommandByName(
      `FROM kibana_sample_data_ecommerce
  | EVAL customer_id = TO_LONG(customer_id)
  | LOOKUP JOIN customer_data ON customer_id | LOOKUP JOIN test1123`,
      'test1123',
      'new_index'
    );
    expect(result).toBe(`FROM kibana_sample_data_ecommerce
  | EVAL customer_id = TO_LONG(customer_id)
  | LOOKUP JOIN customer_data ON customer_id
  | LOOKUP JOIN new_index`);
  });
});

describe('appendIndexToJoinCommandByPosition', () => {
  it('should append an index name to the join command', () => {
    const result = appendIndexToJoinCommandByPosition(
      'FROM kibana_sample_data_logs | LOOKUP JOIN  | LIMIT 10',
      { lineNumber: 1, column: 44 } as monaco.Position,
      'new_index'
    );
    expect(result).toBe(`FROM kibana_sample_data_logs
  | LOOKUP JOIN new_index
  | LIMIT 10`);
  });

  it('should append an index name to the join command in a multi-line query', () => {
    const result = appendIndexToJoinCommandByPosition(
      `FROM kibana_sample_data_logs
  | LOOKUP JOIN\u0020
  | LIMIT 10`,
      { lineNumber: 2, column: 17 } as monaco.Position,
      'new_index'
    );
    expect(result).toBe(`FROM kibana_sample_data_logs
  | LOOKUP JOIN new_index
  | LIMIT 10`);
  });

  it('should append an index name to the correct join command', () => {
    const result = appendIndexToJoinCommandByPosition(
      'FROM kibana_sample_data_logs | LOOKUP JOIN new_index ON some_field | LOOKUP JOIN  | LIMIT 10',
      { lineNumber: 1, column: 82 } as monaco.Position,
      'another_index'
    );
    expect(result).toBe(`FROM kibana_sample_data_logs
  | LOOKUP JOIN new_index ON some_field
  | LOOKUP JOIN another_index
  | LIMIT 10`);
  });

  it('should not append an index name if an index argument with the same name is already present', () => {
    const result = appendIndexToJoinCommandByPosition(
      'FROM kibana_sample_data_logs | LOOKUP JOIN new_index | LIMIT 10',
      { lineNumber: 1, column: 53 } as monaco.Position,
      'new_index'
    );
    expect(result).toBe('FROM kibana_sample_data_logs | LOOKUP JOIN new_index | LIMIT 10');
  });

  it('should replace the existing index argument', () => {
    const result = appendIndexToJoinCommandByPosition(
      'FROM kibana_sample_data_logs | LOOKUP JOIN new_index | LIMIT 10',
      { lineNumber: 1, column: 53 } as monaco.Position,
      'new_index_2'
    );
    expect(result).toBe(`FROM kibana_sample_data_logs
  | LOOKUP JOIN new_index_2
  | LIMIT 10`);
  });
});
