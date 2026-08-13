/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FilterOperator } from './filter_input_codec';
import { projectRoutingCodec } from './project_routing_codec';
import { parseDefaultProjectRouting, reconcileDecodedRouting } from '.';

const availableProjectIds = ['origin', 'linked1', 'linked2'];

describe('reconcileDecodedRouting', () => {
  it('uses excludedProjectIds when no selected ids are present', () => {
    expect(
      reconcileDecodedRouting(
        {
          filterExpressions: [],
          excludedProjectIds: ['linked1'],
          selectedProjectIds: [],
          projectRoutingStrategy: 'dynamic',
        },
        availableProjectIds
      )
    ).toEqual({
      filterExpressions: [],
      excludedOverrides: ['linked1'],
    });
  });

  it('complements selected ids against available projects for snapshot routing', () => {
    expect(
      reconcileDecodedRouting(
        {
          filterExpressions: [],
          excludedProjectIds: [],
          selectedProjectIds: ['origin', 'linked1'],
          projectRoutingStrategy: 'snapshot',
        },
        availableProjectIds
      )
    ).toEqual({
      filterExpressions: [],
      excludedOverrides: ['linked2'],
    });
  });
});

describe('parseDefaultProjectRouting', () => {
  it('returns empty defaults for blank routing', () => {
    expect(parseDefaultProjectRouting('', availableProjectIds)).toEqual({
      filterExpressions: [],
      excludedOverrides: [],
    });
  });

  it('parses a single tag filter', () => {
    expect(parseDefaultProjectRouting('_alias:_origin', availableProjectIds)).toEqual({
      filterExpressions: [
        {
          operator: FilterOperator.EQUALS,
          tagName: '_alias',
          tagValue: '_origin',
        },
      ],
      excludedOverrides: [],
    });
  });

  it('parses EXISTS tag filters from wildcard routing', () => {
    expect(parseDefaultProjectRouting('_alias:*', availableProjectIds)).toEqual({
      filterExpressions: [
        {
          operator: FilterOperator.EXISTS,
          tagName: '_alias',
          tagValue: undefined,
        },
      ],
      excludedOverrides: [],
    });
  });

  it('parses NOT _id exclusions', () => {
    expect(parseDefaultProjectRouting('(_id:* AND NOT _id:linked1)', availableProjectIds)).toEqual({
      filterExpressions: [],
      excludedOverrides: ['linked1'],
    });
  });

  it('parses explicit _id inclusions into exclusions for non-included projects', () => {
    expect(parseDefaultProjectRouting('_id:origin AND _id:linked1', availableProjectIds)).toEqual({
      filterExpressions: [],
      excludedOverrides: ['linked2'],
    });
  });

  it('combines tag filters with NOT _id exclusions', () => {
    expect(
      parseDefaultProjectRouting(
        '_type:security AND (_id:* AND NOT _id:linked1)',
        availableProjectIds
      )
    ).toEqual({
      filterExpressions: [
        {
          operator: FilterOperator.EQUALS,
          tagName: '_type',
          tagValue: 'security',
        },
      ],
      excludedOverrides: ['linked1'],
    });
  });

  it('parses compound NOT_EQUALS tag filters alongside _id clauses', () => {
    expect(
      parseDefaultProjectRouting(
        '(_type:* AND NOT _type:observability) AND (_id:* AND NOT _id:linked1)',
        availableProjectIds
      )
    ).toEqual({
      filterExpressions: [
        {
          operator: FilterOperator.NOT_EQUALS,
          tagName: '_type',
          tagValue: 'observability',
        },
      ],
      excludedOverrides: ['linked1'],
    });
  });

  it('parses grouped NOT ONE OF tag filters alongside _id clauses', () => {
    expect(
      parseDefaultProjectRouting(
        '(env:* AND NOT (env:prod OR env:staging)) AND (_id:* AND NOT _id:linked1)',
        availableProjectIds
      )
    ).toEqual({
      filterExpressions: [
        {
          operator: FilterOperator.NOT_ONE_OF,
          tagName: 'env',
          tagValue: ['prod', 'staging'],
        },
      ],
      excludedOverrides: ['linked1'],
    });
  });

  it('parses unparenthesized legacy NOT_ONE_OF beside a selection group', () => {
    expect(
      parseDefaultProjectRouting(
        'env:* AND NOT (env:prod OR env:staging) AND (_id:* AND NOT _id:linked1)',
        availableProjectIds
      )
    ).toEqual({
      filterExpressions: [
        {
          operator: FilterOperator.NOT_ONE_OF,
          tagName: 'env',
          tagValue: ['prod', 'staging'],
        },
      ],
      excludedOverrides: ['linked1'],
    });
  });

  it('round-trips parsed defaults through encode in dynamic mode', () => {
    const defaultProjectRouting = '_type:security AND (_id:* AND NOT _id:linked1)';
    const parsed = parseDefaultProjectRouting(defaultProjectRouting, availableProjectIds);

    expect(
      projectRoutingCodec.encode({
        filterExpressions: parsed.filterExpressions,
        excludedProjectIds: parsed.excludedOverrides,
        selectedProjectIds: ['origin', 'linked2'],
        projectRoutingStrategy: 'dynamic',
      })
    ).toBe(defaultProjectRouting);
  });
});
