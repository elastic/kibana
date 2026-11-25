/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PROJECT_ROUTING } from '@kbn/cps-common';
import { FilterOperator } from './filter_input_codec';
import { projectRoutingCodec } from './project_routing_codec';
import {
  areProjectRoutingsEquivalent,
  parseDefaultProjectRouting,
  reconcileDecodedRouting,
} from '.';

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

  it('parses a lone _id snapshot as excluding every other available project', () => {
    expect(parseDefaultProjectRouting('_id:p2', ['p1', 'p2'], 'p1')).toEqual({
      filterExpressions: [],
      excludedOverrides: ['p1'],
    });
  });

  it('parses a single tag filter', () => {
    expect(parseDefaultProjectRouting('_organisation:acme', availableProjectIds)).toEqual({
      filterExpressions: [
        {
          operator: FilterOperator.EQUALS,
          tagName: '_organisation',
          tagValue: 'acme',
        },
      ],
      excludedOverrides: [],
    });
  });

  it('parses EXISTS tag filters from wildcard routing', () => {
    expect(parseDefaultProjectRouting('_organisation:*', availableProjectIds)).toEqual({
      filterExpressions: [
        {
          operator: FilterOperator.EXISTS,
          tagName: '_organisation',
          tagValue: undefined,
        },
      ],
      excludedOverrides: [],
    });
  });

  it('treats PROJECT_ROUTING.ALL as exists `_alias` with no exclusions', () => {
    expect(parseDefaultProjectRouting(PROJECT_ROUTING.ALL, availableProjectIds)).toEqual({
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

  it('treats PROJECT_ROUTING.ORIGIN as exists `_alias` excluding every project but the origin', () => {
    expect(
      parseDefaultProjectRouting(PROJECT_ROUTING.ORIGIN, availableProjectIds, 'origin')
    ).toEqual({
      filterExpressions: [
        {
          operator: FilterOperator.EXISTS,
          tagName: '_alias',
          tagValue: undefined,
        },
      ],
      excludedOverrides: ['linked1', 'linked2'],
    });
  });

  it('treats PROJECT_ROUTING.ORIGIN as exists `_alias` with no exclusions when no origin id is known', () => {
    expect(parseDefaultProjectRouting(PROJECT_ROUTING.ORIGIN, availableProjectIds)).toEqual({
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
    expect(parseDefaultProjectRouting('(_id:origin OR _id:linked1)', availableProjectIds)).toEqual({
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

describe('areProjectRoutingsEquivalent', () => {
  it('treats identical routing strings as equivalent', () => {
    expect(
      areProjectRoutingsEquivalent(
        '_type:security AND (_id:* AND NOT _id:linked1)',
        '_type:security AND (_id:* AND NOT _id:linked1)',
        availableProjectIds
      )
    ).toBe(true);
  });

  it('treats snapshot inclusions as equivalent to the complementary dynamic exclusions', () => {
    expect(
      areProjectRoutingsEquivalent(
        '(_id:origin OR _id:linked2)',
        '(_id:* AND NOT _id:linked1)',
        availableProjectIds
      )
    ).toBe(true);
  });

  it('does not treat PROJECT_ROUTING.ALL as equivalent to blank routing', () => {
    expect(areProjectRoutingsEquivalent(PROJECT_ROUTING.ALL, '', availableProjectIds)).toBe(false);
  });

  it('treats PROJECT_ROUTING.ORIGIN as equivalent to exists `_alias` plus origin-only selection', () => {
    expect(
      areProjectRoutingsEquivalent(
        PROJECT_ROUTING.ORIGIN,
        '_alias:* AND _id:origin',
        availableProjectIds,
        'origin'
      )
    ).toBe(true);
    expect(
      areProjectRoutingsEquivalent(
        PROJECT_ROUTING.ORIGIN,
        '_alias:* AND (_id:* AND NOT (_id:linked1 OR _id:linked2))',
        availableProjectIds,
        'origin'
      )
    ).toBe(true);
  });

  it('does not treat bare origin-only exclusions as ORIGIN', () => {
    expect(
      areProjectRoutingsEquivalent(
        PROJECT_ROUTING.ORIGIN,
        '(_id:* AND NOT (_id:linked1 OR _id:linked2))',
        availableProjectIds,
        'origin'
      )
    ).toBe(false);
  });

  it('does not treat a snapshot of a non-origin project as ORIGIN', () => {
    expect(areProjectRoutingsEquivalent('_id:p2', PROJECT_ROUTING.ORIGIN, ['p1', 'p2'], 'p1')).toBe(
      false
    );
  });

  it('returns false when exclusions differ', () => {
    expect(
      areProjectRoutingsEquivalent(
        '(_id:* AND NOT _id:linked1)',
        '(_id:* AND NOT _id:linked2)',
        availableProjectIds
      )
    ).toBe(false);
  });

  it('returns false when filter expressions differ', () => {
    expect(
      areProjectRoutingsEquivalent('_type:security', '_organisation:acme', availableProjectIds)
    ).toBe(false);
  });
});
