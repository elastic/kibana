/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import { Parser, synth } from '@elastic/esql';
import { columnsAfter } from './columns_after';

describe('KEEP', () => {
  it('should return the correct fields after the command', () => {
    const previousCommandFields: ESQLFieldWithMetadata[] = [
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'field2', type: 'double', userDefined: false },
    ];

    const result = columnsAfter(synth.cmd`KEEP field1`, previousCommandFields, '');

    expect(result).toEqual([{ name: 'field1', type: 'keyword', userDefined: false }]);
  });

  it('returns fields in the order specified by the command', () => {
    const previousCommandFields: ESQLFieldWithMetadata[] = [
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'field2', type: 'double', userDefined: false },
    ];

    const result = columnsAfter(synth.cmd`KEEP field2, field1`, previousCommandFields, '');

    expect(result.map(({ name }) => name)).toEqual(['field2', 'field1']);
  });

  it('keeps the last occurrence of repeated fields', () => {
    const previousCommandFields: ESQLFieldWithMetadata[] = [
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'field2', type: 'double', userDefined: false },
    ];

    const result = columnsAfter(synth.cmd`KEEP field1, field2, field1`, previousCommandFields, '');

    expect(result.map(({ name }) => name)).toEqual(['field2', 'field1']);
  });

  it.each([
    ['*, tot*, other, to*, total', ['leftover', 'other', 'total_extra', 'total']],
    ['total, to*, tot*, *', ['total', 'total_extra', 'other', 'leftover']],
  ] as const)('orders KEEP %s by precedence and the rightmost tie', (selectors, expected) => {
    const previousColumns = [
      'total_extra',
      'other',
      'leftover',
      'total',
    ].map<ESQLFieldWithMetadata>((name) => ({ name, type: 'keyword', userDefined: false }));

    const query = `FROM logs | KEEP ${selectors}`;
    const { root } = Parser.parse(query);
    const result = columnsAfter(root.commands[1], previousColumns, query);

    expect(result.map(({ name }) => name)).toEqual(expected);
  });

  it('treats quoted asterisks as literal characters', () => {
    const previousColumns = ['metric*', 'metric*sum', 'metric_sum'].map<ESQLFieldWithMetadata>(
      (name) => ({ name, type: 'keyword', userDefined: false })
    );

    const exactQuery = 'FROM logs | KEEP `metric*`';
    const patternQuery = 'FROM logs | KEEP `metric*`*';
    const exactCommand = Parser.parse(exactQuery).root.commands[1];
    const patternCommand = Parser.parse(patternQuery).root.commands[1];

    expect(columnsAfter(exactCommand, previousColumns, exactQuery).map(({ name }) => name)).toEqual(
      ['metric*']
    );
    expect(
      columnsAfter(patternCommand, previousColumns, patternQuery).map(({ name }) => name)
    ).toEqual(['metric*', 'metric*sum']);
  });
});
