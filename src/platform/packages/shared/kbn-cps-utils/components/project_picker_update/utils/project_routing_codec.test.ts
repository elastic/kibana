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
  encodeFilterOnlyRouting,
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
    ).toBe('(env:* AND NOT env:prod)');
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
    ).toBe('(env:* AND NOT (env:prod OR env:staging))');
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

describe('encodeFilterOnlyRouting', () => {
  it('returns undefined when there are no filter expressions', () => {
    expect(encodeFilterOnlyRouting([])).toBeUndefined();
  });

  it('encodes tag filters without _id selection clauses', () => {
    expect(encodeFilterOnlyRouting([typeSecurityExpression])).toBe('_type:security');
  });

  it('joins multiple tag filters with AND', () => {
    expect(
      encodeFilterOnlyRouting([
        typeSecurityExpression,
        {
          operator: FilterOperator.EQUALS,
          tagName: 'env',
          tagValue: 'prod',
        },
      ])
    ).toBe('_type:security AND env:prod');
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
    expect(decodeTagFilterRoutingClause('(env:* AND NOT env:prod)')).toEqual({
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
    expect(decodeTagFilterRoutingClause('(env:* AND NOT (env:prod OR env:staging))')).toEqual({
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

describe('project routing codec', () => {
  describe('projectRoutingCodec.encode', () => {
    it('throws when asked to encode an input with unknown strategy', () => {
      expect(() =>
        projectRoutingCodec.encode({
          ...emptyEncodeInput,
          projectRoutingStrategy: 'unknown',
        })
      ).toThrow('project routing strategy unknown is not valid for encoding');
    });

    describe('dynamic mode', () => {
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

      it('emits an _id wildcard and NOT clause when exclusions exist in dynamic mode', () => {
        expect(
          projectRoutingCodec.encode({
            ...emptyEncodeInput,
            excludedProjectIds: ['linked1'],
            selectedProjectIds: ['origin', 'linked2'],
          })
        ).toBe('_id:* AND NOT _id:linked1');
      });

      it('groups multiple dynamic exclusions as a NOT of an OR', () => {
        expect(
          projectRoutingCodec.encode({
            ...emptyEncodeInput,
            excludedProjectIds: ['linked1', 'linked2'],
            selectedProjectIds: ['origin'],
          })
        ).toBe('_id:* AND NOT (_id:linked1 OR _id:linked2)');
      });

      it('combines free tag filters with a grouped dynamic selection negation', () => {
        expect(
          projectRoutingCodec.encode({
            ...emptyEncodeInput,
            filterExpressions: [typeSecurityExpression],
            excludedProjectIds: ['linked1', 'linked2'],
            selectedProjectIds: ['origin'],
          })
        ).toBe('_type:security AND (_id:* AND NOT (_id:linked1 OR _id:linked2))');
      });

      it('keeps parenthesized NOT_EQUALS free beside the dynamic selection group', () => {
        expect(
          projectRoutingCodec.encode({
            ...emptyEncodeInput,
            filterExpressions: [
              {
                operator: FilterOperator.NOT_EQUALS,
                tagName: 'env',
                tagValue: 'prod',
              },
            ],
            excludedProjectIds: ['linked1', 'linked2'],
          })
        ).toBe('(env:* AND NOT env:prod) AND (_id:* AND NOT (_id:linked1 OR _id:linked2))');
      });

      it('keeps parenthesized NOT_ONE_OF free beside the dynamic selection group', () => {
        expect(
          projectRoutingCodec.encode({
            ...emptyEncodeInput,
            filterExpressions: [
              {
                operator: FilterOperator.NOT_ONE_OF,
                tagName: 'env',
                tagValue: ['prod', 'staging'],
              },
            ],
            excludedProjectIds: ['linked1', 'linked2'],
          })
        ).toBe(
          '(env:* AND NOT (env:prod OR env:staging)) AND (_id:* AND NOT (_id:linked1 OR _id:linked2))'
        );
      });

      it('keeps ONE_OF free beside the dynamic selection group', () => {
        expect(
          projectRoutingCodec.encode({
            ...emptyEncodeInput,
            filterExpressions: [
              {
                operator: FilterOperator.ONE_OF,
                tagName: 'env',
                tagValue: ['prod', 'staging'],
              },
            ],
            excludedProjectIds: ['linked1', 'linked2'],
          })
        ).toBe('(env:prod OR env:staging) AND (_id:* AND NOT (_id:linked1 OR _id:linked2))');
      });

      it('does not emit selectedProjectIds in dynamic output', () => {
        expect(
          projectRoutingCodec.encode({
            ...emptyEncodeInput,
            filterExpressions: [typeSecurityExpression],
            excludedProjectIds: ['linked1'],
            selectedProjectIds: ['origin', 'linked2'],
          })
        ).toBe('_type:security AND (_id:* AND NOT _id:linked1)');
      });

      it('ANDs together multiple independent tag filters in dynamic mode', () => {
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

      it('keeps two independent filters (one compound) free beside grouped exclusions', () => {
        expect(
          projectRoutingCodec.encode({
            ...emptyEncodeInput,
            filterExpressions: [
              typeSecurityExpression,
              {
                operator: FilterOperator.NOT_EQUALS,
                tagName: 'env',
                tagValue: 'prod',
              },
            ],
            excludedProjectIds: ['linked1', 'linked2'],
          })
        ).toBe(
          '_type:security AND (env:* AND NOT env:prod) AND (_id:* AND NOT (_id:linked1 OR _id:linked2))'
        );
      });
    });

    describe('snapshot mode', () => {
      it('returns an empty string when there are no filters or selected ids', () => {
        expect(
          projectRoutingCodec.encode({
            ...emptyEncodeInput,
            projectRoutingStrategy: 'snapshot',
          })
        ).toBe('');
      });

      it('emits an OR of explicit id clauses in snapshot mode and ignores exclusions', () => {
        expect(
          projectRoutingCodec.encode({
            ...emptyEncodeInput,
            excludedProjectIds: ['linked1'],
            selectedProjectIds: ['origin', 'linked2'],
            projectRoutingStrategy: 'snapshot',
          })
        ).toBe('_id:origin OR _id:linked2');
      });

      it('emits a single selected id without parentheses', () => {
        expect(
          projectRoutingCodec.encode({
            ...emptyEncodeInput,
            selectedProjectIds: ['origin'],
            projectRoutingStrategy: 'snapshot',
          })
        ).toBe('_id:origin');
      });

      it('emits snapshot filters as free conjuncts and AND-adds the grouped selected ids', () => {
        expect(
          projectRoutingCodec.encode({
            ...emptyEncodeInput,
            filterExpressions: [typeSecurityExpression],
            selectedProjectIds: ['origin', 'linked1'],
            projectRoutingStrategy: 'snapshot',
          })
        ).toBe('_type:security AND (_id:origin OR _id:linked1)');
      });

      it('keeps compound filters self-parenthesized beside snapshot selected ids', () => {
        expect(
          projectRoutingCodec.encode({
            ...emptyEncodeInput,
            filterExpressions: [
              {
                operator: FilterOperator.NOT_EQUALS,
                tagName: 'env',
                tagValue: 'prod',
              },
              { operator: FilterOperator.EQUALS, tagName: 'region', tagValue: 'us' },
            ],
            selectedProjectIds: ['origin'],
            projectRoutingStrategy: 'snapshot',
          })
        ).toBe('(env:* AND NOT env:prod) AND region:us AND _id:origin');
      });
    });
  });

  describe('projectRoutingCodec.decode', () => {
    it('returns empty unknown defaults for blank routing', () => {
      expect(projectRoutingCodec.decode('')).toEqual({
        filterExpressions: [],
        excludedProjectIds: [],
        selectedProjectIds: [],
        projectRoutingStrategy: 'unknown',
      });
    });

    it('returns empty unknown defaults for whitespace-only routing', () => {
      expect(projectRoutingCodec.decode('   ')).toEqual({
        filterExpressions: [],
        excludedProjectIds: [],
        selectedProjectIds: [],
        projectRoutingStrategy: 'unknown',
      });
    });

    it('decodes a single tag filter as unknown without an _id tail', () => {
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
        projectRoutingStrategy: 'unknown',
      });
    });

    it('decodes multiple independent tag filters ANDed together as unknown without an _id tail', () => {
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
        projectRoutingStrategy: 'unknown',
      });
    });

    it('returns selected project ids for an ids-only snapshot OR group', () => {
      expect(projectRoutingCodec.decode('(_id:origin OR _id:linked1)')).toEqual({
        filterExpressions: [],
        excludedProjectIds: [],
        selectedProjectIds: ['origin', 'linked1'],
        projectRoutingStrategy: 'snapshot',
      });
    });

    it('returns a selected project id for a lone _id equality', () => {
      expect(projectRoutingCodec.decode('_id:origin')).toEqual({
        filterExpressions: [],
        excludedProjectIds: [],
        selectedProjectIds: ['origin'],
        projectRoutingStrategy: 'snapshot',
      });
    });

    it('returns unknown when an id equality is mixed with an id OR group', () => {
      expect(projectRoutingCodec.decode('_id:origin AND (_id:linked1 OR _id:linked2)')).toEqual({
        filterExpressions: [],
        excludedProjectIds: [],
        selectedProjectIds: [],
        projectRoutingStrategy: 'unknown',
      });
    });

    it('returns unknown when a selection OR group contains a wildcard', () => {
      expect(projectRoutingCodec.decode('(_id:* OR _id:origin)')).toEqual({
        filterExpressions: [],
        excludedProjectIds: [],
        selectedProjectIds: [],
        projectRoutingStrategy: 'unknown',
      });
    });

    it('classifies a grouped dynamic selection negation without filters', () => {
      expect(projectRoutingCodec.decode('(_id:* AND NOT _id:linked1)')).toEqual({
        filterExpressions: [],
        excludedProjectIds: ['linked1'],
        selectedProjectIds: [],
        projectRoutingStrategy: 'dynamic',
      });
    });

    it('classifies grouped dynamic exclusions from a NOT of an OR', () => {
      expect(projectRoutingCodec.decode('(_id:* AND NOT (_id:linked1 OR _id:linked2))')).toEqual({
        filterExpressions: [],
        excludedProjectIds: ['linked1', 'linked2'],
        selectedProjectIds: [],
        projectRoutingStrategy: 'dynamic',
      });
    });

    it('decodes a free filter beside a grouped single exclusion', () => {
      expect(projectRoutingCodec.decode('_type:security AND (_id:* AND NOT _id:linked1)')).toEqual({
        filterExpressions: [
          {
            operator: FilterOperator.EQUALS,
            tagName: '_type',
            tagValue: 'security',
          },
        ],
        excludedProjectIds: ['linked1'],
        selectedProjectIds: [],
        projectRoutingStrategy: 'dynamic',
      });
    });

    it('groups compound tag filters split by a grouped _id selection', () => {
      expect(
        projectRoutingCodec.decode(
          '(_type:* AND NOT _type:observability) AND (_id:* AND NOT _id:linked1)'
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

    it('decodes an independent filter alongside a compound filter and grouped exclusions', () => {
      expect(
        projectRoutingCodec.decode(
          'region:us AND (_type:* AND NOT _type:observability) AND (_id:* AND NOT (_id:linked1 OR _id:linked2))'
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
        excludedProjectIds: ['linked1', 'linked2'],
        selectedProjectIds: [],
        projectRoutingStrategy: 'dynamic',
      });
    });

    it('does not mix a NOT_ONE_OF OR group into _id exclusions', () => {
      expect(
        projectRoutingCodec.decode(
          '(env:* AND NOT (env:prod OR env:staging)) AND (_id:* AND NOT (_id:linked1 OR _id:linked2))'
        )
      ).toEqual({
        filterExpressions: [
          {
            operator: FilterOperator.NOT_ONE_OF,
            tagName: 'env',
            tagValue: ['prod', 'staging'],
          },
        ],
        excludedProjectIds: ['linked1', 'linked2'],
        selectedProjectIds: [],
        projectRoutingStrategy: 'dynamic',
      });
    });

    it('returns unknown for multiple selection groups instead of leaking _id filters', () => {
      expect(
        projectRoutingCodec.decode('(_id:* AND NOT _id:linked1) AND (_id:* AND NOT _id:linked2)')
      ).toEqual({
        filterExpressions: [],
        excludedProjectIds: [],
        selectedProjectIds: [],
        projectRoutingStrategy: 'unknown',
      });
    });

    it('returns unknown when a grouped _id:* is missing its NOT negation', () => {
      expect(projectRoutingCodec.decode('_type:security AND _id:*')).toEqual({
        filterExpressions: [],
        excludedProjectIds: [],
        selectedProjectIds: [],
        projectRoutingStrategy: 'unknown',
      });
    });

    it('decodes free snapshot filters beside a grouped id selection', () => {
      expect(projectRoutingCodec.decode('_type:security AND (_id:origin OR _id:linked2)')).toEqual({
        filterExpressions: [
          {
            operator: FilterOperator.EQUALS,
            tagName: '_type',
            tagValue: 'security',
          },
        ],
        excludedProjectIds: [],
        selectedProjectIds: ['origin', 'linked2'],
        projectRoutingStrategy: 'snapshot',
      });
    });

    it('decodes compound snapshot filters beside selected ids', () => {
      expect(
        projectRoutingCodec.decode('(env:* AND NOT env:prod) AND region:us AND _id:origin')
      ).toEqual({
        filterExpressions: [
          {
            operator: FilterOperator.NOT_EQUALS,
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
        selectedProjectIds: ['origin'],
        projectRoutingStrategy: 'snapshot',
      });
    });

    it('decodes unparenthesized compound snapshot filters beside selected ids', () => {
      expect(projectRoutingCodec.decode('env:* AND NOT env:prod AND _id:origin')).toEqual({
        filterExpressions: [
          {
            operator: FilterOperator.NOT_EQUALS,
            tagName: 'env',
            tagValue: 'prod',
          },
        ],
        excludedProjectIds: [],
        selectedProjectIds: ['origin'],
        projectRoutingStrategy: 'snapshot',
      });
    });

    it('decodes NOT_ONE_OF snapshot filters beside selected ids', () => {
      expect(
        projectRoutingCodec.decode('(env:* AND NOT (env:prod OR env:staging)) AND _id:origin')
      ).toEqual({
        filterExpressions: [
          {
            operator: FilterOperator.NOT_ONE_OF,
            tagName: 'env',
            tagValue: ['prod', 'staging'],
          },
        ],
        excludedProjectIds: [],
        selectedProjectIds: ['origin'],
        projectRoutingStrategy: 'snapshot',
      });
    });

    it('returns unknown when a selection group is missing _id:*', () => {
      expect(projectRoutingCodec.decode('_type:security AND NOT _id:linked1')).toEqual({
        filterExpressions: [],
        excludedProjectIds: [],
        selectedProjectIds: [],
        projectRoutingStrategy: 'unknown',
      });
    });

    it('returns empty unknown defaults for unparseable routing', () => {
      expect(projectRoutingCodec.decode('env:prod AND (((broken')).toEqual({
        filterExpressions: [],
        excludedProjectIds: [],
        selectedProjectIds: [],
        projectRoutingStrategy: 'unknown',
      });
    });

    it('returns named references as empty unknown defaults', () => {
      expect(projectRoutingCodec.decode('@custom-expression')).toEqual({
        filterExpressions: [],
        excludedProjectIds: [],
        selectedProjectIds: [],
        projectRoutingStrategy: 'unknown',
      });
    });

    it('validates decode output against ProjectRoutingExpressionSchema', () => {
      const decoded = projectRoutingCodec.decode('_type:security AND (_id:* AND NOT _id:linked1)');
      expect(ProjectRoutingExpressionSchema.parse(decoded)).toEqual(decoded);
    });
  });

  describe('projectRoutingCodec round-trip', () => {
    it('round-trips parsed defaults through encode in dynamic mode', () => {
      const defaultProjectRouting = '_type:security AND (_id:* AND NOT _id:linked1)';
      const decoded = projectRoutingCodec.decode(defaultProjectRouting);

      expect(decoded.projectRoutingStrategy).toBe('dynamic');
      expect(projectRoutingCodec.encode(decoded)).toBe(defaultProjectRouting);
    });

    it('round-trips a parenthesized NOT_EQUALS with two dynamic exclusions', () => {
      const defaultProjectRouting =
        '(env:* AND NOT env:prod) AND (_id:* AND NOT (_id:linked1 OR _id:linked2))';
      const decoded = projectRoutingCodec.decode(defaultProjectRouting);

      expect(decoded.projectRoutingStrategy).toBe('dynamic');
      expect(projectRoutingCodec.encode(decoded)).toBe(defaultProjectRouting);
    });

    it('round-trips a parenthesized NOT_ONE_OF with two dynamic exclusions', () => {
      const defaultProjectRouting =
        '(env:* AND NOT (env:prod OR env:staging)) AND (_id:* AND NOT (_id:linked1 OR _id:linked2))';
      const decoded = projectRoutingCodec.decode(defaultProjectRouting);

      expect(decoded.projectRoutingStrategy).toBe('dynamic');
      expect(projectRoutingCodec.encode(decoded)).toBe(defaultProjectRouting);
    });

    it('round-trips snapshot filters and grouped selected ids', () => {
      const defaultProjectRouting =
        '(env:* AND NOT env:prod) AND region:us AND (_id:origin OR _id:linked2)';
      const decoded = projectRoutingCodec.decode(defaultProjectRouting);

      expect(decoded.projectRoutingStrategy).toBe('snapshot');
      expect(projectRoutingCodec.encode(decoded)).toBe(defaultProjectRouting);
    });

    it('round-trips an ids-only snapshot OR group', () => {
      const defaultProjectRouting = '_id:origin OR _id:linked2';
      const decoded = projectRoutingCodec.decode(defaultProjectRouting);

      expect(decoded.projectRoutingStrategy).toBe('snapshot');
      expect(projectRoutingCodec.encode(decoded)).toBe(defaultProjectRouting);
    });

    it('round-trips a simple snapshot filter with a selected id', () => {
      const defaultProjectRouting = '_type:security AND _id:origin';
      const decoded = projectRoutingCodec.decode(defaultProjectRouting);

      expect(decoded.projectRoutingStrategy).toBe('snapshot');
      expect(projectRoutingCodec.encode(decoded)).toBe(defaultProjectRouting);
    });
  });
});
