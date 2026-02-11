/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Parser, synth } from '../../../..';
import { summary } from './summary';

describe('STATS summary', () => {
  it('returns new column for assignment', () => {
    const command = synth.cmd`STATS var0=AVG(field2)`;
    const result = summary(command, '');

    expect(result.newColumns).toEqual(new Set(['var0']));
  });

  it('returns new column for expression without assignment', () => {
    const queryString = `FROM index | STATS AVG(field2)`;
    const {
      root: {
        commands: [, command],
      },
    } = Parser.parseQuery(queryString);
    const result = summary(command, queryString);

    expect(result.newColumns).toEqual(new Set(['AVG(field2)']));
  });

  it('returns aggregation column but not plain grouping column reference', () => {
    const queryString = `FROM a | STATS AVG(field2) BY field1`;
    const {
      root: {
        commands: [, command],
      },
    } = Parser.parseQuery(queryString);
    const result = summary(command, queryString);

    expect(result.newColumns).toEqual(new Set(['AVG(field2)']));
  });

  it('returns assigned aggregation and assigned grouping columns', () => {
    const queryString = `FROM a | STATS avg=AVG(field2) BY buckets=BUCKET(@timestamp,50,?_tstart,?_tend)`;
    const {
      root: {
        commands: [, command],
      },
    } = Parser.parseQuery(queryString);
    const result = summary(command, queryString);

    expect(result.newColumns).toEqual(new Set(['avg', 'buckets']));
  });
});
