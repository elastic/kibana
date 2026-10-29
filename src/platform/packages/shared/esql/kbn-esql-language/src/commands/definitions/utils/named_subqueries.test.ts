/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isSource, Parser } from '@elastic/esql';
import type { ESQLAstQueryExpression, ESQLSource } from '@elastic/esql/types';
import {
  findNamedSubqueryForSource,
  getNamedSubqueries,
  getNamedSubqueriesAvailableTo,
  resolveNamedSubquerySources,
} from './named_subqueries';

const parse = (query: string): ESQLAstQueryExpression => Parser.parse(query).root;

const getSource = (query: string): ESQLSource => {
  const source = parse(query).commands[0].args.find(isSource);

  if (!source || !isSource(source)) {
    throw new Error(`Expected a source in query: ${query}`);
  }

  return source;
};

describe('getNamedSubqueries', () => {
  it('extracts LET bindings in declaration order', () => {
    const root = parse(
      'SET time_zone = "UTC"; LET first = (FROM logs-*); LET second = (FROM metrics-*); FROM second'
    );

    const bindings = getNamedSubqueries(root.header);

    expect(bindings.map(({ name }) => name)).toEqual(['first', 'second']);
    expect(bindings.map(({ query }) => query.commands[0].name)).toEqual(['from', 'from']);
  });

  it('returns an empty list when the query has no LET header', () => {
    expect(getNamedSubqueries(parse('FROM logs-*').header)).toEqual([]);
  });
});

describe('findNamedSubqueryForSource', () => {
  it('resolves only an unqualified local source', () => {
    const namedSubqueries = getNamedSubqueries(
      parse('LET selected = (FROM logs-*); FROM selected').header
    );

    expect(findNamedSubqueryForSource(getSource('FROM selected'), namedSubqueries)?.name).toBe(
      'selected'
    );
    expect(
      findNamedSubqueryForSource(getSource('FROM remote:selected'), namedSubqueries)
    ).toBeUndefined();
    expect(
      findNamedSubqueryForSource(getSource('FROM selected::data'), namedSubqueries)
    ).toBeUndefined();
  });
});

describe('getNamedSubqueriesAvailableTo', () => {
  it('returns only bindings declared before the selected binding', () => {
    const namedSubqueries = getNamedSubqueries(
      parse(
        'LET first = (FROM logs-*); LET second = (FROM first); LET third = (FROM second); FROM third'
      ).header
    );

    expect(getNamedSubqueriesAvailableTo(namedSubqueries, namedSubqueries[2])).toEqual(
      namedSubqueries.slice(0, 2)
    );
  });
});

describe('resolveNamedSubquerySources', () => {
  it('resolves chained bindings and nested FROM subqueries to index sources', () => {
    const root = parse(
      'LET base = (FROM (FROM logs-*)); LET selected = (FROM base); FROM selected'
    );
    const sources = resolveNamedSubquerySources(root.commands[0], getNamedSubqueries(root.header));

    expect(sources.map(({ name }) => name)).toEqual(['logs-*']);
  });

  it('resolves shared dependencies without duplicate index sources', () => {
    const root = parse(
      'LET base = (FROM logs-*, remote:logs-*); LET first = (FROM base, base); LET second = (FROM first, base); FROM first, (FROM second), logs-*'
    );
    const namedSubqueries = getNamedSubqueries(root.header);
    const sources = resolveNamedSubquerySources(root.commands[0], namedSubqueries);

    expect(sources.map(({ name }) => name)).toEqual(['logs-*', 'remote:logs-*']);
    expect(resolveNamedSubquerySources(root.commands[0], namedSubqueries)).toEqual(sources);
  });
});
