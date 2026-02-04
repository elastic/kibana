/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { synth } from '../../../..';
import type { ESQLColumnData } from '../types';
import { columnsAfter } from './columns_after';

describe('COMPLETION', () => {
  it('adds "completion" field, when targetField is not specified', () => {
    const previousCommandColumns: ESQLColumnData[] = [
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'count', type: 'double', userDefined: false },
    ];

    const result = columnsAfter(
      synth.cmd`COMPLETION "prompt" WITH {"inference_id": "my-inference-id"}`,
      previousCommandColumns,
      ''
    );

    expect(result).toEqual([
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'count', type: 'double', userDefined: false },
      { name: 'completion', type: 'keyword', userDefined: false },
    ]);
  });

  it('adds the given targetField as field, when targetField is specified', () => {
    const previousCommandColumns: ESQLColumnData[] = [
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'count', type: 'double', userDefined: false },
    ];

    const result = columnsAfter(
      synth.cmd`COMPLETION customField = "prompt" WITH {"inference_id": "my-inference-id"}`,
      previousCommandColumns,
      ''
    );

    expect(result).toEqual([
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'count', type: 'double', userDefined: false },
      { name: 'customField', type: 'keyword', userDefined: true, location: { min: 0, max: 0 } },
    ]);
  });
});
