/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { synth } from '../../../..';
import type { ESQLFieldWithMetadata, ESQLUserDefinedColumn } from '../../types';
import { columnsAfter } from './columns_after';

describe('STATS', () => {
  it('adds the user defined column, when no grouping is given', () => {
    const previousCommandFields = [
      { name: 'field1', type: 'keyword' },
      { name: 'field2', type: 'double' },
    ] as ESQLFieldWithMetadata[];
    const context = {
      userDefinedColumns: new Map<string, ESQLUserDefinedColumn[]>([
        [
          'var0',
          [
            {
              name: 'var0',
              type: 'double',
              location: { min: 0, max: 10 },
            },
          ],
        ],
      ]),
      fields: new Map<string, ESQLFieldWithMetadata>([
        ['field1', { name: 'field1', type: 'keyword' }],
        ['count', { name: 'count', type: 'double' }],
      ]),
    };

    const result = columnsAfter(synth.cmd`STATS var0=AVG(field2)`, previousCommandFields, context);

    expect(result).toEqual([{ name: 'var0', type: 'double' }]);
  });

  it('adds the escaped column, when no grouping is given', () => {
    const previousCommandFields = [
      { name: 'field1', type: 'keyword' },
      { name: 'field2', type: 'double' },
    ] as ESQLFieldWithMetadata[];

    const context = {
      userDefinedColumns: new Map<string, ESQLUserDefinedColumn[]>([
        [
          'AVG(field2)',
          [
            {
              name: 'AVG(field2)',
              type: 'double',
              location: { min: 0, max: 10 },
            },
          ],
        ],
      ]),
      fields: new Map<string, ESQLFieldWithMetadata>([
        ['field1', { name: 'field1', type: 'keyword' }],
        ['count', { name: 'count', type: 'double' }],
      ]),
    };

    const result = columnsAfter(synth.cmd`STATS AVG(field2)`, previousCommandFields, context);

    expect(result).toEqual([{ name: 'AVG(field2)', type: 'double' }]);
  });

  it('adds the escaped and grouping columns', () => {
    const previousCommandFields = [
      { name: 'field1', type: 'keyword' },
      { name: 'field2', type: 'double' },
    ] as ESQLFieldWithMetadata[];

    const context = {
      userDefinedColumns: new Map<string, ESQLUserDefinedColumn[]>([
        [
          'AVG(field2)',
          [
            {
              name: 'AVG(field2)',
              type: 'double',
              location: { min: 0, max: 10 },
            },
          ],
        ],
      ]),
      fields: new Map<string, ESQLFieldWithMetadata>([
        ['field1', { name: 'field1', type: 'keyword' }],
        ['count', { name: 'count', type: 'double' }],
      ]),
    };

    const result = columnsAfter(
      synth.cmd`STATS AVG(field2) BY field1`,
      previousCommandFields,
      context
    );

    expect(result).toEqual([
      { name: 'field1', type: 'keyword' },
      { name: 'AVG(field2)', type: 'double' },
    ]);
  });

  it('adds the user defined and grouping columns', () => {
    const previousCommandFields = [
      { name: 'field1', type: 'keyword' },
      { name: 'field2', type: 'double' },
      { name: '@timestamp', type: 'date' },
    ] as ESQLFieldWithMetadata[];

    const context = {
      userDefinedColumns: new Map<string, ESQLUserDefinedColumn[]>([
        [
          'AVG(field2)',
          [
            {
              name: 'AVG(field2)',
              type: 'double',
              location: { min: 0, max: 10 },
            },
          ],
        ],
        [
          'buckets',
          [
            {
              name: 'buckets',
              type: 'unknown',
              location: { min: 0, max: 10 },
            },
          ],
        ],
      ]),
      fields: new Map<string, ESQLFieldWithMetadata>([
        ['field1', { name: 'field1', type: 'keyword' }],
        ['count', { name: 'count', type: 'double' }],
      ]),
    };

    const result = columnsAfter(
      synth.cmd`STATS AVG(field2) BY buckets=BUCKET(@timestamp,50,?_tstart,?_tend)`,
      previousCommandFields,
      context
    );

    expect(result).toEqual([
      { name: 'AVG(field2)', type: 'double' },
      { name: 'buckets', type: 'unknown' },
    ]);
  });
});
