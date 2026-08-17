/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FilterOperator, type FilterExpressionValue } from './filter_input_codec';
import type { ProjectRoutingExpression } from './project_routing_codec';
import {
  decodeTagFilterRoutingClause,
  encodeTagFilterRoutingClause,
  projectRoutingCodec,
  ProjectRoutingExpressionSchema,
} from './project_routing_codec';

const typeSecurityExpression = {
  operator: FilterOperator.EQUALS,
  tagName: '_type',
  tagValue: 'security',
} as const;

const emptyEncodeInput: ProjectRoutingExpression = {
  filterExpressions: [],
  excludedProjectIds: [],
  selectedProjectIds: [],
  projectRoutingStrategy: 'dynamic',
};

describe('encodeTagFilterRoutingClause', () => {
  it('encodes an equals filter as a tag:value clause', () => {
    expect(
      encodeTagFilterRoutingClause({
        operator: FilterOperator.EQUALS,
        tagName: 'env',
        tagValue: 'prod',
      })
    ).toBe('env:prod');
  });

  it('encodes a not-equals filter as an exists clause minus the value', () => {
    expect(
      encodeTagFilterRoutingClause({
        operator: FilterOperator.NOT_EQUALS,
        tagName: 'env',
        tagValue: 'prod',
      })
    ).toBe('env:* AND NOT env:prod');
  });

  it('encodes a one-of filter as OR-joined tag:value clauses', () => {
    expect(
      encodeTagFilterRoutingClause({
        operator: FilterOperator.ONE_OF,
        tagName: 'env',
        tagValue: ['prod', 'staging'],
      })
    ).toBe('(env:prod OR env:staging)');
  });

  it('encodes a not-one-of filter as an exists clause minus the OR group', () => {
    expect(
      encodeTagFilterRoutingClause({
        operator: FilterOperator.NOT_ONE_OF,
        tagName: 'env',
        tagValue: ['prod', 'staging'],
      })
    ).toBe('env:* AND NOT (env:prod OR env:staging)');
  });

  it('encodes an exists filter as a wildcard clause', () => {
    expect(
      encodeTagFilterRoutingClause({
        operator: FilterOperator.EXISTS,
        tagName: 'env',
        tagValue: undefined,
      })
    ).toBe('env:*');
  });

  it('encodes a not-exists filter as a negated wildcard clause', () => {
    expect(
      encodeTagFilterRoutingClause({
        operator: FilterOperator.NOT_EXISTS,
        tagName: 'env',
        tagValue: undefined,
      })
    ).toBe('NOT env:*');
  });
});

describe('decodeTagFilterRoutingClause', () => {
  it('decodes an equals filter from a tag:value clause', () => {
    expect(decodeTagFilterRoutingClause('env:prod')).toEqual({
      operator: FilterOperator.EQUALS,
      tagName: 'env',
      tagValue: 'prod',
    });
  });

  it('decodes a not-equals filter from an exists clause minus the value', () => {
    expect(decodeTagFilterRoutingClause('env:* AND NOT env:prod')).toEqual({
      operator: FilterOperator.NOT_EQUALS,
      tagName: 'env',
      tagValue: 'prod',
    });
  });

  it('decodes a one-of filter from OR-joined tag:value clauses', () => {
    expect(decodeTagFilterRoutingClause('env:prod OR env:staging')).toEqual({
      operator: FilterOperator.ONE_OF,
      tagName: 'env',
      tagValue: ['prod', 'staging'],
    });
  });

  it('decodes a not-one-of filter from an exists clause minus the OR group', () => {
    expect(decodeTagFilterRoutingClause('env:* AND NOT (env:prod OR env:staging)')).toEqual({
      operator: FilterOperator.NOT_ONE_OF,
      tagName: 'env',
      tagValue: ['prod', 'staging'],
    });
  });

  it('decodes an exists filter from a wildcard clause', () => {
    expect(decodeTagFilterRoutingClause('env:*')).toEqual({
      operator: FilterOperator.EXISTS,
      tagName: 'env',
      tagValue: undefined,
    });
  });

  it('decodes a not-exists filter from a negated wildcard clause', () => {
    expect(decodeTagFilterRoutingClause('NOT env:*')).toEqual({
      operator: FilterOperator.NOT_EXISTS,
      tagName: 'env',
      tagValue: undefined,
    });
  });

  it('decodes tag names and values containing underscores and colons', () => {
    expect(decodeTagFilterRoutingClause('_alias:_origin')).toEqual({
      operator: FilterOperator.EQUALS,
      tagName: '_alias',
      tagValue: '_origin',
    });
  });

  it('throws for empty input', () => {
    expect(() => decodeTagFilterRoutingClause('')).toThrow(
      'Cannot decode empty project routing clause'
    );
    expect(() => decodeTagFilterRoutingClause('   ')).toThrow(
      'Cannot decode empty project routing clause'
    );
  });

  it('throws for named project routing references', () => {
    expect(() => decodeTagFilterRoutingClause('@custom-expression')).toThrow(
      'Cannot decode named project routing reference'
    );
  });

  it('throws on colon-free input without quadratic regex cost', () => {
    expect(() => decodeTagFilterRoutingClause('no-colon')).toThrow(
      'Invalid project routing Lucene clause: missing tag:value atom'
    );

    const start = performance.now();
    expect(() => decodeTagFilterRoutingClause('a'.repeat(50_000))).toThrow(
      'Invalid project routing Lucene clause: missing tag:value atom'
    );
    expect(performance.now() - start).toBeLessThan(100);
  });

  it('throws for mixed-tag OR groups', () => {
    expect(() => decodeTagFilterRoutingClause('env:prod OR region:us')).toThrow(
      'Invalid project routing OR group: mixed tag names'
    );
  });

  it('throws for unrecognized clauses', () => {
    expect(() => decodeTagFilterRoutingClause('env:prod AND region:us')).toThrow(
      'Cannot decode project routing AND clause'
    );
  });
});

describe('tag filter round-tripping', () => {
  const cases: FilterExpressionValue[] = [
    { operator: FilterOperator.EQUALS, tagName: 'env', tagValue: 'prod' },
    { operator: FilterOperator.NOT_EQUALS, tagName: 'env', tagValue: 'prod' },
    { operator: FilterOperator.ONE_OF, tagName: 'env', tagValue: ['prod', 'staging'] },
    { operator: FilterOperator.NOT_ONE_OF, tagName: 'env', tagValue: ['prod', 'staging'] },
    { operator: FilterOperator.EXISTS, tagName: 'env', tagValue: undefined },
    { operator: FilterOperator.NOT_EXISTS, tagName: 'env', tagValue: undefined },
  ];

  it.each(cases)('recovers $operator after encode -> decode', (expression) => {
    expect(decodeTagFilterRoutingClause(encodeTagFilterRoutingClause(expression))).toEqual(
      expression
    );
  });
});

describe('projectRoutingCodec.encode', () => {
  it('returns an empty string when there are no filters or exclusions', () => {
    expect(
      projectRoutingCodec.encode({
        ...emptyEncodeInput,
        selectedProjectIds: ['origin', 'linked1'],
      })
    ).toBe('');
  });

  it('emits tag filters without _id clauses when there are no exclusions', () => {
    expect(
      projectRoutingCodec.encode({
        ...emptyEncodeInput,
        filterExpressions: [typeSecurityExpression],
        selectedProjectIds: ['origin'],
      })
    ).toBe('_type:security');
  });

  it('emits _id wildcard and NOT clauses when exclusions exist in dynamic mode', () => {
    expect(
      projectRoutingCodec.encode({
        ...emptyEncodeInput,
        excludedProjectIds: ['linked1'],
        selectedProjectIds: ['origin', 'linked2'],
      })
    ).toBe('_id:* AND NOT _id:linked1');
  });

  it('combines tag filters with dynamic id exclusions', () => {
    expect(
      projectRoutingCodec.encode({
        ...emptyEncodeInput,
        filterExpressions: [typeSecurityExpression],
        excludedProjectIds: ['linked1'],
        selectedProjectIds: ['origin', 'linked2'],
      })
    ).toBe('_type:security AND _id:* AND NOT _id:linked1');
  });

  it('emits explicit id clauses in snapshot mode when exclusions exist', () => {
    expect(
      projectRoutingCodec.encode({
        ...emptyEncodeInput,
        excludedProjectIds: ['linked1'],
        selectedProjectIds: ['origin', 'linked2'],
        projectRoutingStrategy: 'snapshot',
      })
    ).toBe('_id:origin AND _id:linked2');
  });

  it('ANDs together multiple independent tag filters', () => {
    expect(
      projectRoutingCodec.encode({
        ...emptyEncodeInput,
        filterExpressions: [
          typeSecurityExpression,
          { operator: FilterOperator.EQUALS, tagName: 'region', tagValue: 'us' },
        ],
        selectedProjectIds: ['origin'],
      })
    ).toBe('_type:security AND region:us');
  });
});

describe('projectRoutingCodec.decode', () => {
  it('returns empty defaults for blank routing', () => {
    expect(projectRoutingCodec.decode('')).toEqual({
      filterExpressions: [],
      excludedProjectIds: [],
      selectedProjectIds: [],
      projectRoutingStrategy: 'dynamic',
    });
  });

  it('decodes a single tag filter', () => {
    expect(projectRoutingCodec.decode('env:prod')).toEqual({
      filterExpressions: [
        {
          operator: FilterOperator.EQUALS,
          tagName: 'env',
          tagValue: 'prod',
        },
      ],
      excludedProjectIds: [],
      selectedProjectIds: [],
      projectRoutingStrategy: 'snapshot',
    });
  });

  it('decodes multiple independent tag filters ANDed together', () => {
    expect(projectRoutingCodec.decode('env:prod AND region:us')).toEqual({
      filterExpressions: [
        {
          operator: FilterOperator.EQUALS,
          tagName: 'env',
          tagValue: 'prod',
        },
        {
          operator: FilterOperator.EQUALS,
          tagName: 'region',
          tagValue: 'us',
        },
      ],
      excludedProjectIds: [],
      selectedProjectIds: [],
      projectRoutingStrategy: 'snapshot',
    });
  });

  it('returns selected and excluded project ids explicitly without reconciliation', () => {
    expect(projectRoutingCodec.decode('_id:origin AND _id:linked1')).toEqual({
      filterExpressions: [],
      excludedProjectIds: [],
      selectedProjectIds: ['origin', 'linked1'],
      projectRoutingStrategy: 'snapshot',
    });
  });

  it('classifies dynamic exclusions without selected ids', () => {
    expect(projectRoutingCodec.decode('_id:* AND NOT _id:linked1')).toEqual({
      filterExpressions: [],
      excludedProjectIds: ['linked1'],
      selectedProjectIds: [],
      projectRoutingStrategy: 'dynamic',
    });
  });

  it('groups compound tag filters split by _id clauses', () => {
    expect(
      projectRoutingCodec.decode(
        '_type:* AND NOT _type:observability AND _id:* AND NOT _id:linked1'
      )
    ).toEqual({
      filterExpressions: [
        {
          operator: FilterOperator.NOT_EQUALS,
          tagName: '_type',
          tagValue: 'observability',
        },
      ],
      excludedProjectIds: ['linked1'],
      selectedProjectIds: [],
      projectRoutingStrategy: 'dynamic',
    });
  });

  it('decodes an independent filter alongside a compound filter and _id clauses', () => {
    expect(
      projectRoutingCodec.decode(
        'region:us AND _type:* AND NOT _type:observability AND _id:* AND NOT _id:linked1'
      )
    ).toEqual({
      filterExpressions: [
        {
          operator: FilterOperator.EQUALS,
          tagName: 'region',
          tagValue: 'us',
        },
        {
          operator: FilterOperator.NOT_EQUALS,
          tagName: '_type',
          tagValue: 'observability',
        },
      ],
      excludedProjectIds: ['linked1'],
      selectedProjectIds: [],
      projectRoutingStrategy: 'dynamic',
    });
  });

  it('returns named references as empty defaults', () => {
    expect(projectRoutingCodec.decode('@custom-expression')).toEqual({
      filterExpressions: [],
      excludedProjectIds: [],
      selectedProjectIds: [],
      projectRoutingStrategy: 'dynamic',
    });
  });

  it('validates decode output against ProjectRoutingExpressionSchema', () => {
    const decoded = projectRoutingCodec.decode('_type:security AND _id:* AND NOT _id:linked1');
    expect(ProjectRoutingExpressionSchema.parse(decoded)).toEqual(decoded);
  });
});

describe('projectRoutingCodec round-trip', () => {
  it('round-trips parsed defaults through encode in dynamic mode', () => {
    const defaultProjectRouting = '_type:security AND _id:* AND NOT _id:linked1';
    const decoded = projectRoutingCodec.decode(defaultProjectRouting);

    expect(
      projectRoutingCodec.encode({
        filterExpressions: decoded.filterExpressions,
        excludedProjectIds: decoded.excludedProjectIds,
        selectedProjectIds: ['origin', 'linked2'],
        projectRoutingStrategy: 'dynamic',
      })
    ).toBe(defaultProjectRouting);
  });

  it('round-trips multiple independent tag filters mixed with a compound filter and exclusions', () => {
    const defaultProjectRouting =
      'region:us AND _type:* AND NOT _type:observability AND _id:* AND NOT _id:linked1';
    const decoded = projectRoutingCodec.decode(defaultProjectRouting);

    expect(
      projectRoutingCodec.encode({
        filterExpressions: decoded.filterExpressions,
        excludedProjectIds: decoded.excludedProjectIds,
        selectedProjectIds: ['origin', 'linked2'],
        projectRoutingStrategy: 'dynamic',
      })
    ).toBe(defaultProjectRouting);
  });
});
