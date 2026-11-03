/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildWorkflowFilters } from '@kbn/workflows/server';
import {
  buildConditionalTermsFilters,
  buildWorkflowTextSearchClause,
} from './workflow_query_filters';

describe('buildWorkflowFilters', () => {
  it('returns only filters explicitly requested', () => {
    expect(buildWorkflowFilters()).toEqual({ must: [], must_not: [] });
  });

  it('returns ids and spaceId must clauses with deleted_at exclusion', () => {
    const result = buildWorkflowFilters({
      ids: ['workflow-a'],
      space: { id: 'my-space' },
      deleted: 'not_deleted',
    });

    expect(result.must).toEqual([
      { ids: { values: ['workflow-a'] } },
      { term: { spaceId: 'my-space' } },
    ]);
    expect(result.must_not).toEqual([{ exists: { field: 'deleted_at' } }]);
  });

  it('returns deleted_at inclusion when deleted filter is deleted', () => {
    const result = buildWorkflowFilters({ deleted: 'deleted' });

    expect(result.must).toEqual([{ exists: { field: 'deleted_at' } }]);
    expect(result.must_not).toEqual([]);
  });

  it('returns space/global visibility clause when includeGlobal is true', () => {
    const result = buildWorkflowFilters({
      space: { id: 'my-space', includeGlobal: true },
      deleted: 'not_deleted',
    });

    expect(result.must).toEqual([
      {
        bool: {
          should: [{ term: { spaceId: 'my-space' } }, { term: { spaceId: '*' } }],
          minimum_should_match: 1,
        },
      },
    ]);
    expect(result.must_not).toEqual([{ exists: { field: 'deleted_at' } }]);
  });

  it('returns managed inclusion when managed filter is managed', () => {
    const result = buildWorkflowFilters({ managed: 'managed' });

    expect(result.must).toEqual([{ term: { managed: true } }]);
    expect(result.must_not).toEqual([]);
  });

  it('returns managed exclusion when managed filter is unmanaged', () => {
    const result = buildWorkflowFilters({ managed: 'unmanaged' });

    expect(result.must).toEqual([]);
    expect(result.must_not).toEqual([{ term: { managed: true } }]);
  });

  it('omits managed clauses when managed filter is all', () => {
    expect(buildWorkflowFilters({ managed: 'all' })).toEqual({ must: [], must_not: [] });
  });

  it('omits deleted clauses when deleted filter is all', () => {
    expect(buildWorkflowFilters({ deleted: 'all' })).toEqual({ must: [], must_not: [] });
  });
});

describe('buildConditionalTermsFilters', () => {
  it('returns empty array for no filters', () => {
    expect(buildConditionalTermsFilters([])).toEqual([]);
  });

  it('skips undefined values', () => {
    const result = buildConditionalTermsFilters([
      { field: 'enabled', values: undefined },
      { field: 'tags', values: ['a'] },
    ]);
    expect(result).toEqual([{ terms: { tags: ['a'] } }]);
  });

  it('skips empty arrays', () => {
    const result = buildConditionalTermsFilters([{ field: 'enabled', values: [] }]);
    expect(result).toEqual([]);
  });

  it('builds terms clauses for non-empty arrays', () => {
    const result = buildConditionalTermsFilters([
      { field: 'enabled', values: [true] },
      { field: 'createdBy', values: ['user1', 'user2'] },
      { field: 'tags', values: ['tag1'] },
    ]);
    expect(result).toEqual([
      { terms: { enabled: [true] } },
      { terms: { createdBy: ['user1', 'user2'] } },
      { terms: { tags: ['tag1'] } },
    ]);
  });
});

describe('buildWorkflowTextSearchClause', () => {
  const getBool = (clause: ReturnType<typeof buildWorkflowTextSearchClause>) =>
    (clause as { bool: { should: unknown[]; minimum_should_match: number } }).bool;

  it('returns a bool query with five should clauses', () => {
    const { should, minimum_should_match } = getBool(buildWorkflowTextSearchClause('my workflow'));
    expect(should).toHaveLength(5);
    expect(minimum_should_match).toBe(1);
  });

  it('matches the exact name case-insensitively on name.keyword', () => {
    const { should } = getBool(buildWorkflowTextSearchClause(' system-alert-triage '));

    expect(should).toContainEqual({
      term: {
        'name.keyword': { value: 'system-alert-triage', case_insensitive: true, boost: 10 },
      },
    });
  });

  it('requires every word to match in some field', () => {
    const { should } = getBool(buildWorkflowTextSearchClause('invoice  production'));
    const clauses = should as Array<{ bool?: { must?: unknown[] } }>;

    expect(clauses.find((clause) => clause.bool?.must)?.bool?.must).toEqual(
      ['invoice', 'production'].map((word) => ({
        multi_match: {
          query: word,
          fields: ['name^2', 'description', 'tags'],
          type: 'best_fields',
          operator: 'and',
        },
      }))
    );
  });

  it('skips words without letters or digits', () => {
    const { should } = getBool(buildWorkflowTextSearchClause('Security - Attack'));
    const clauses = should as Array<{
      bool?: { must?: Array<{ multi_match: { query: string } }> };
    }>;

    const words = clauses
      .find((clause) => clause.bool?.must)
      ?.bool?.must?.map(({ multi_match }) => multi_match.query);
    expect(words).toEqual(['Security', 'Attack']);
  });

  it('omits the all-words clause when no word has letters or digits', () => {
    const { should } = getBool(buildWorkflowTextSearchClause('-'));
    const clauses = should as Array<{ bool?: { must?: unknown[] } }>;

    expect(should).toHaveLength(4);
    expect(clauses.some((clause) => clause.bool?.must)).toBe(false);
  });

  it('uses the query string in all multi_match clauses', () => {
    const { should } = getBool(buildWorkflowTextSearchClause('test query'));
    const clauses = should as Array<Record<string, unknown>>;

    const multiMatches = clauses.filter((clause) => 'multi_match' in clause);
    expect(multiMatches).toHaveLength(2);
    multiMatches.forEach((clause) => {
      expect((clause.multi_match as { query: string }).query).toBe('test query');
    });
  });

  it('uses the query string in wildcard clauses', () => {
    const { should } = getBool(buildWorkflowTextSearchClause('find-me'));
    const clauses = should as Array<Record<string, unknown>>;

    const wildcardClause = clauses.find(
      (clause) => 'bool' in clause && 'should' in (clause.bool as object)
    );
    expect(wildcardClause).toBeDefined();

    const wildcardShould = (wildcardClause as { bool: { should: unknown[] } }).bool.should;
    expect(wildcardShould).toHaveLength(3);

    const nameWildcard = wildcardShould[0] as {
      wildcard: { 'name.keyword': { value: string } };
    };
    expect(nameWildcard.wildcard['name.keyword'].value).toBe('*find-me*');
  });
});
