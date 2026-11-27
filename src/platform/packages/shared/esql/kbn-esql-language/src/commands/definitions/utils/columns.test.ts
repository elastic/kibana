/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { synth } from '@elastic/esql';
import { columnsAfter as columnsAfterDrop } from '../../registry/drop/columns_after';
import type { ESQLColumnData } from '../../registry/types';
import { columnsWithFlattenedKeys, escapeEsqlColumnName, getFlattenedKeyColumn } from './columns';

describe('escapeEsqlColumnName', () => {
  it.each([
    {
      name: 'leaves a valid column path unchanged',
      input: 'host.name',
      expected: 'host.name',
    },
    {
      name: 'quotes a numeric segment at the end',
      input: 'system.cpu.load_average.1',
      expected: 'system.cpu.load_average.`1`',
    },
    {
      name: 'quotes a numeric segment in the middle',
      input: 'system.1.load_average',
      expected: 'system.`1`.load_average',
    },
    {
      name: 'quotes a reserved boolean literal',
      input: 'my.field.true',
      expected: 'my.field.`true`',
    },
    {
      name: 'quotes a segment containing a hyphen',
      input: 'host.cpu-load.value',
      expected: 'host.`cpu-load`.value',
    },
  ])('$name', ({ input, expected }) => {
    expect(escapeEsqlColumnName(input)).toBe(expected);
  });

  it('does not double existing backticks', () => {
    expect(escapeEsqlColumnName('system.cpu.load_average.`1`')).toBe('system.cpu.load_average.`1`');
  });
});

describe('getFlattenedKeyColumn', () => {
  const columns = new Map<string, ESQLColumnData>([
    ['labels', { name: 'labels', type: 'flattened', userDefined: false }],
    ['labels.env', { name: 'labels.env', type: 'double', userDefined: false }],
    ['keywordField', { name: 'keywordField', type: 'keyword', userDefined: false }],
  ]);

  it('types an unmapped key under a flattened field as keyword', () => {
    expect(getFlattenedKeyColumn('labels.team', columns)).toEqual({
      name: 'labels.team',
      type: 'keyword',
      userDefined: false,
    });
    expect(getFlattenedKeyColumn('labels.nested.region', columns)).toEqual({
      name: 'labels.nested.region',
      type: 'keyword',
      userDefined: false,
    });
  });

  it('leaves an exactly mapped field to its mapped type', () => {
    expect(getFlattenedKeyColumn('labels.env', columns)).toBeUndefined();
  });

  it('stops at a closer mapped field instead of the flattened parent', () => {
    expect(getFlattenedKeyColumn('labels.env.region', columns)).toBeUndefined();
  });

  it('ignores a parent that is not flattened', () => {
    expect(getFlattenedKeyColumn('keywordField.env', columns)).toBeUndefined();
  });

  it('ignores wildcard names', () => {
    expect(getFlattenedKeyColumn('labels.*', columns)).toBeUndefined();
  });
});

describe('columnsWithFlattenedKeys', () => {
  const previousColumns: ESQLColumnData[] = [
    { name: 'flattenedField', type: 'flattened', userDefined: false },
    { name: 'keywordField', type: 'keyword', userDefined: false },
  ];

  it('does not leak a flattened key named only inside an IN subquery', () => {
    const afterWhere = columnsWithFlattenedKeys(
      synth.cmd`WHERE keywordField IN (FROM other_index | KEEP flattenedField.env)`,
      previousColumns
    );
    const afterDrop = columnsAfterDrop(synth.cmd`DROP flattenedField`, afterWhere);

    expect(afterDrop.map((column) => column.name)).toEqual(['keywordField']);
  });

  it('keeps a flattened key named beside an IN subquery', () => {
    const afterWhere = columnsWithFlattenedKeys(
      synth.cmd`WHERE keywordField IN (FROM other_index | KEEP flattenedField.env) AND flattenedField.team == "prod"`,
      previousColumns
    );

    expect(afterWhere.map((column) => column.name)).toContain('flattenedField.team');
    expect(afterWhere.map((column) => column.name)).not.toContain('flattenedField.env');
  });
});
