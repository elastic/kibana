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
  getNextNamedSubqueryName,
  getUsedNamedSubqueries,
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

describe('getNextNamedSubqueryName', () => {
  it.each([
    ['FROM logs-*', 'subquery0'],
    ['LET subquery0 = (FROM logs-*); FROM subquery0', 'subquery1'],
    ['LET subquery1 = (FROM logs-*); FROM subquery1', 'subquery0'],
    ['LET subquery0 = (FROM a); LET subquery1 = (FROM b); FROM subquery1', 'subquery2'],
  ])('returns the first unused name for "%s"', (query, expected) => {
    expect(getNextNamedSubqueryName(getNamedSubqueries(parse(query).header))).toBe(expected);
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

describe('getUsedNamedSubqueries', () => {
  const getUsedNames = (query: string) => {
    const root = parse(query);
    const used = getUsedNamedSubqueries(root.commands, getNamedSubqueries(root.header));

    return [...used].map(({ name }) => name).sort();
  };

  it('returns the bindings referenced by the main query and, through them, by other bindings', () => {
    expect(
      getUsedNames('LET first = (FROM logs-*); LET second = (FROM first); FROM second')
    ).toEqual(['first', 'second']);
  });

  it('finds shared dependencies across multiple declaration levels', () => {
    expect(
      getUsedNames(
        'LET base = (FROM logs-*); LET first = (FROM base); LET second = (FROM base); LET selected = (FROM first, second); FROM selected'
      )
    ).toEqual(['base', 'first', 'second', 'selected']);
  });

  it('finds references in FROM and IN subqueries', () => {
    expect(
      getUsedNames(
        'LET first = (FROM logs-*); LET second = (FROM logs-*); FROM (FROM first) | WHERE x IN (FROM second | KEEP x)'
      )
    ).toEqual(['first', 'second']);
  });

  it.each([
    'LET selected = (FROM logs-*); TS selected',
    'LET selected = (FROM logs-*); FROM index | LOOKUP JOIN selected ON keywordField',
  ])('does not treat unsupported source references as dependencies: %s', (query) => {
    expect(getUsedNames(query)).toEqual([]);
  });

  it('ignores unused bindings and references to later bindings', () => {
    expect(
      getUsedNames(
        'LET first = (FROM second); LET second = (FROM logs-*); LET unused = (FROM logs-*); FROM first'
      )
    ).toEqual(['first']);
  });
});
