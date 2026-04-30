/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildConditionalTermsFilters,
  buildWorkflowTextSearchClause,
  workflowSpaceFilter,
} from './workflow_query_filters';

describe('workflowSpaceFilter', () => {
  it('returns spaceId must clause and deleted_at exclusion by default', () => {
    const result = workflowSpaceFilter('my-space');
    expect(result.must).toEqual([{ term: { spaceId: 'my-space' } }]);
    expect(result.must_not).toEqual([{ exists: { field: 'deleted_at' } }]);
  });

  it('omits deleted_at exclusion when includeDeleted is true', () => {
    const result = workflowSpaceFilter('my-space', { includeDeleted: true });
    expect(result.must).toEqual([{ term: { spaceId: 'my-space' } }]);
    expect(result.must_not).toEqual([]);
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

  it('returns a bool query with four should clauses', () => {
    const { should, minimum_should_match } = getBool(buildWorkflowTextSearchClause('my workflow'));
    expect(should).toHaveLength(4);
    expect(minimum_should_match).toBe(1);
  });

  it('uses the query string in all multi_match clauses', () => {
    const { should } = getBool(buildWorkflowTextSearchClause('test query'));
    const clauses = should as Array<Record<string, unknown>>;

    const multiMatches = clauses.filter((clause) => 'multi_match' in clause);
    expect(multiMatches).toHaveLength(3);
    multiMatches.forEach((clause) => {
      expect((clause.multi_match as { query: string }).query).toBe('test query');
    });
  });

  it('uses the query string in wildcard clauses', () => {
    const { should } = getBool(buildWorkflowTextSearchClause('find-me'));
    const clauses = should as Array<Record<string, unknown>>;

    const wildcardClause = clauses.find((clause) => 'bool' in clause);
    expect(wildcardClause).toBeDefined();

    const wildcardShould = (wildcardClause as { bool: { should: unknown[] } }).bool.should;
    expect(wildcardShould).toHaveLength(3);

    const nameWildcard = wildcardShould[0] as {
      wildcard: { 'name.keyword': { value: string } };
    };
    expect(nameWildcard.wildcard['name.keyword'].value).toBe('*find-me*');
  });
});
