/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { appendIndexToJoinCommand } from './create_lookup_index';
import { monaco } from '@kbn/monaco';

describe('appendIndexToJoinCommand', () => {
  const cursorPosition = { lineNumber: 1, column: 44 } as monaco.Position;
  const indexName = 'new_index';

  it('should append index name to the join command', () => {
    const result = appendIndexToJoinCommand(
      'FROM kibana_sample_data_logs | LOOKUP JOIN  | LIMIT 10',
      { lineNumber: 1, column: 44 } as monaco.Position,
      indexName
    );
    expect(result).toBe('FROM kibana_sample_data_logs | LOOKUP JOIN new_index | LIMIT 10');
  });

  it('should throw an error if join command is not found', () => {
    expect(() =>
      appendIndexToJoinCommand('FROM kibana_sample_data_logs ', cursorPosition, indexName)
    ).toThrow('Could not find join command in the query');
  });
});
