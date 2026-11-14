/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '@elastic/esql';
import type { NamedSubquery } from '../../commands/definitions/utils/named_subqueries';
import { getPipelinesToValidate } from './subqueries';

const getPipelines = (query: string) => {
  const { header = [], commands } = Parser.parse(query).root;

  return getPipelinesToValidate(header, commands);
};

const getNames = (namedSubqueries: readonly NamedSubquery[]) =>
  namedSubqueries.map(({ name }) => name);

describe('getPipelinesToValidate', () => {
  it('gives each pipeline the SET commands and the LET bindings declared before it', () => {
    const pipelines = getPipelines(
      'SET time_zone = "UTC"; LET a = (FROM index); LET b = (FROM a); FROM b'
    );

    expect(pipelines.map(({ header }) => header.map(({ name }) => name))).toEqual([
      ['set'],
      ['set', 'let'],
      ['set', 'let', 'let'],
    ]);
    expect(pipelines.map(({ namedSubqueries }) => getNames(namedSubqueries))).toEqual([
      [],
      ['a'],
      ['a', 'b'],
    ]);
    expect(pipelines.map(({ forwardNamedSubqueries }) => getNames(forwardNamedSubqueries))).toEqual(
      [['a', 'b'], ['b'], []]
    );
  });

  it('analyzes the main query and only the LET bodies it uses', () => {
    const pipelines = getPipelines(
      'LET a = (FROM index); LET b = (FROM a); LET unused = (FROM index); FROM b'
    );

    expect(pipelines.map(({ analyzed }) => analyzed)).toEqual([true, true, false, true]);
  });
});
