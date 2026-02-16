/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Parser } from '../../../..';
import { summary } from './summary';

describe('STATS summary', () => {
  it.each([
    {
      description: 'STATS with assigned aggregation',
      query: 'FROM index | STATS var0=AVG(field2)',
      expectedNewColumns: ['var0'],
      expectedAggregates: ['var0'],
      expectedGrouping: [],
    },
    {
      description: 'STATS with function aggregation',
      query: 'FROM index | STATS AVG(field2)',
      expectedNewColumns: ['AVG(field2)'],
      expectedAggregates: ['AVG(field2)'],
      expectedGrouping: [],
    },
    {
      description: 'STATS with function aggregation and grouping',
      query: 'FROM a | STATS AVG(field2) BY field1',
      expectedNewColumns: ['AVG(field2)'],
      expectedAggregates: ['AVG(field2)'],
      expectedGrouping: ['field1'],
    },
    {
      description: 'STATS with assigned aggregation and assigned grouping columns',
      query: 'FROM a | STATS avg=AVG(field2) BY buckets=BUCKET(@timestamp,50,?_tstart,?_tend)',
      expectedNewColumns: ['avg', 'buckets'],
      expectedAggregates: ['avg'],
      expectedGrouping: ['buckets'],
    },
    {
      description: 'STATS with assigned aggregation and WHERE clause',
      query: 'FROM a | STATS avg=AVG(field2) WHERE field1 > 100',
      expectedNewColumns: ['avg'],
      expectedAggregates: ['avg'],
      expectedGrouping: [],
    },
    {
      description: 'STATS with function aggregation and WHERE clause',
      query: 'FROM a | STATS AVG(field2) WHERE field1 > 100',
      expectedNewColumns: ['AVG(field2)'],
      expectedAggregates: ['AVG(field2)'],
      expectedGrouping: [],
    },
    {
      description: 'can handle many aggregates and groupings',
      query: 'FROM a | STATS AVG(field1), field2, MIN(field3) BY field4, field5',
      expectedNewColumns: ['AVG(field1)', 'field2', 'MIN(field3)'],
      expectedAggregates: ['AVG(field1)', 'field2', 'MIN(field3)'],
      expectedGrouping: ['field4', 'field5'],
    },
    {
      description: 'can have params and quoted fields in grouping',
      query: 'FROM index | STATS max(1) BY `a😎`, ?123, a.?b.?0.`😎`',
      expectedNewColumns: ['max(1)'],
      expectedAggregates: ['max(1)'],
      expectedGrouping: ['a😎', '?123', 'a.?b.?0.😎'],
    },
    {
      description: 'works well with BUCKET function',
      query: 'FROM index | STATS BY BUCKET(@timestamp,50,?_tstart,?_tend)',
      expectedNewColumns: ['BUCKET(@timestamp,50,?_tstart,?_tend)'],
      expectedAggregates: [],
      expectedGrouping: ['BUCKET(@timestamp,50,?_tstart,?_tend)'],
    },
  ])('$description', ({ query, expectedNewColumns, expectedAggregates, expectedGrouping }) => {
    const {
      root: {
        commands: [, command],
      },
    } = Parser.parseQuery(query);
    const result = summary(command, query);

    expect(result.newColumns).toEqual(new Set(expectedNewColumns));
    expect(result.aggregates).toEqual(
      new Set(
        expectedAggregates.map((field) =>
          expect.objectContaining({
            field,
          })
        )
      )
    );
    expect(result.grouping).toEqual(
      new Set(
        expectedGrouping.map((field) =>
          expect.objectContaining({
            field,
          })
        )
      )
    );
  });
});
