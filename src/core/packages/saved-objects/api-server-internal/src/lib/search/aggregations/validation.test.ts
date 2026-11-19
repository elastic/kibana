/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import { ACL_MAPPING } from '@kbn/ols';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import { validateAndConvertAggregations } from './validation';

type AggsMap = Record<string, estypes.AggregationsAggregationContainer>;

const mockMappings = {
  properties: {
    updated_at: {
      type: 'date',
    },
    references: {
      type: 'nested',
      properties: {
        id: {
          type: 'keyword',
        },
      },
    },
    foo: {
      properties: {
        title: {
          type: 'text',
        },
        description: {
          type: 'text',
        },
        bytes: {
          type: 'integer',
        },
      },
    },
    bean: {
      properties: {
        canned: {
          fields: {
            text: {
              type: 'text',
            },
          },
          type: 'keyword',
        },
      },
    },
    alert: {
      properties: {
        actions: {
          type: 'nested',
          properties: {
            group: {
              type: 'keyword',
            },
            actionRef: {
              type: 'keyword',
            },
            actionTypeId: {
              type: 'keyword',
            },
            params: {
              enabled: false,
              type: 'object',
            },
          },
        },
        params: {
          type: 'flattened',
        },
      },
    },
  },
} as const;

describe('validateAndConvertAggregations', () => {
  it('validates a simple aggregations', () => {
    expect(
      validateAndConvertAggregations(
        ['foo'],
        { aggName: { max: { field: 'foo.attributes.bytes' } } },
        mockMappings
      )
    ).toEqual({
      aggName: {
        max: {
          field: 'foo.bytes',
        },
      },
    });
  });

  it('validates multi_terms aggregations', () => {
    expect(
      validateAndConvertAggregations(
        ['foo'],
        {
          aggName: {
            multi_terms: {
              terms: [{ field: 'foo.attributes.description' }, { field: 'foo.attributes.bytes' }],
            },
          },
        },
        mockMappings
      )
    ).toEqual({
      aggName: {
        multi_terms: {
          terms: [{ field: 'foo.description' }, { field: 'foo.bytes' }],
        },
      },
    });
  });

  it('validates a nested field in simple aggregations', () => {
    expect(
      validateAndConvertAggregations(
        ['alert'],
        { aggName: { cardinality: { field: 'alert.attributes.actions.group' } } },
        mockMappings
      )
    ).toEqual({
      aggName: {
        cardinality: {
          field: 'alert.actions.group',
        },
      },
    });
  });

  it('validates a nested aggregations', () => {
    expect(
      validateAndConvertAggregations(
        ['alert'],
        {
          aggName: {
            cardinality: {
              field: 'alert.attributes.actions.group',
            },
            aggs: {
              aggName: {
                max: { field: 'alert.attributes.actions.group' },
              },
            },
          },
        },
        mockMappings
      )
    ).toEqual({
      aggName: {
        cardinality: {
          field: 'alert.actions.group',
        },
        aggs: {
          aggName: {
            max: {
              field: 'alert.actions.group',
            },
          },
        },
      },
    });
  });

  it('validates a deeply nested aggregations', () => {
    expect(
      validateAndConvertAggregations(
        ['alert'],
        {
          first: {
            cardinality: {
              field: 'alert.attributes.actions.group',
            },
            aggs: {
              second: {
                max: { field: 'alert.attributes.actions.group' },
                aggs: {
                  third: {
                    min: {
                      field: 'alert.attributes.actions.actionTypeId',
                    },
                  },
                },
              },
            },
          },
        },
        mockMappings
      )
    ).toEqual({
      first: {
        cardinality: {
          field: 'alert.actions.group',
        },
        aggs: {
          second: {
            max: { field: 'alert.actions.group' },
            aggs: {
              third: {
                min: {
                  field: 'alert.actions.actionTypeId',
                },
              },
            },
          },
        },
      },
    });
  });

  it('validates a nested root aggregations', () => {
    expect(
      validateAndConvertAggregations(
        ['alert'],
        {
          aggName: {
            nested: {
              path: 'alert.references',
            },
            aggregations: {
              aggName2: {
                terms: { field: 'alert.references.id' },
              },
            },
          },
        },
        mockMappings
      )
    ).toEqual({
      aggName: {
        nested: {
          path: 'references',
        },
        aggregations: {
          aggName2: {
            terms: {
              field: 'references.id',
            },
          },
        },
      },
    });
  });

  it('rewrites type attributes when valid', () => {
    const aggregations: AggsMap = {
      average: {
        avg: {
          field: 'alert.attributes.actions.group',
          missing: 10,
        },
      },
    };
    expect(validateAndConvertAggregations(['alert'], aggregations, mockMappings)).toEqual({
      average: {
        avg: {
          field: 'alert.actions.group',
          missing: 10,
        },
      },
    });
  });

  it('rewrites root attributes when valid', () => {
    const aggregations: AggsMap = {
      average: {
        avg: {
          field: 'alert.updated_at',
          missing: 10,
        },
      },
    };
    expect(validateAndConvertAggregations(['alert'], aggregations, mockMappings)).toEqual({
      average: {
        avg: {
          field: 'updated_at',
          missing: 10,
        },
      },
    });
  });

  it('throws an error when the `field` name is not using attributes path', () => {
    const aggregations: AggsMap = {
      average: {
        avg: {
          field: 'alert.actions.group',
          missing: 10,
        },
      },
    };
    expect(() =>
      validateAndConvertAggregations(['alert'], aggregations, mockMappings)
    ).toThrowErrorMatchingInlineSnapshot(
      `"[average.avg.field] Invalid attribute path: alert.actions.group"`
    );
  });

  it('throws an error when the `field` name is referencing an invalid field', () => {
    const aggregations: AggsMap = {
      average: {
        avg: {
          field: 'alert.attributes.actions.non_existing',
          missing: 10,
        },
      },
    };
    expect(() =>
      validateAndConvertAggregations(['alert'], aggregations, mockMappings)
    ).toThrowErrorMatchingInlineSnapshot(
      `"[average.avg.field] Invalid attribute path: alert.attributes.actions.non_existing"`
    );
  });

  it('throws an error when the attribute path is referencing an invalid root field', () => {
    const aggregations: AggsMap = {
      average: {
        avg: {
          field: 'alert.bad_root',
          missing: 10,
        },
      },
    };
    expect(() =>
      validateAndConvertAggregations(['alert'], aggregations, mockMappings)
    ).toThrowErrorMatchingInlineSnapshot(
      `"[average.avg.field] Invalid attribute path: alert.bad_root"`
    );
  });

  it('rewrites the `field` name even when nested', () => {
    const aggregations: AggsMap = {
      average: {
        weighted_avg: {
          value: {
            field: 'alert.attributes.actions.group',
            missing: 10,
          },
          weight: {
            field: 'alert.attributes.actions.actionRef',
          },
        },
      },
    };
    expect(validateAndConvertAggregations(['alert'], aggregations, mockMappings)).toEqual({
      average: {
        weighted_avg: {
          value: {
            field: 'alert.actions.group',
            missing: 10,
          },
          weight: {
            field: 'alert.actions.actionRef',
          },
        },
      },
    });
  });

  it('rewrites the entries of a filter term record', () => {
    const aggregations: AggsMap = {
      myFilter: {
        filter: {
          term: {
            'foo.attributes.description': 'hello',
            'foo.attributes.bytes': 10,
          },
        },
      },
    };
    expect(validateAndConvertAggregations(['foo'], aggregations, mockMappings)).toEqual({
      myFilter: {
        filter: {
          term: { 'foo.description': 'hello', 'foo.bytes': 10 },
        },
      },
    });
  });

  it('throws an error when referencing non-allowed types', () => {
    const aggregations: AggsMap = {
      myFilter: {
        max: {
          field: 'foo.attributes.bytes',
        },
      },
    };

    expect(() => {
      validateAndConvertAggregations(['alert'], aggregations, mockMappings);
    }).toThrowErrorMatchingInlineSnapshot(
      `"[myFilter.max.field] Invalid attribute path: foo.attributes.bytes"`
    );
  });

  it('throws an error when trying to validate an unknown aggregation type', () => {
    const aggregations: AggsMap = {
      someAgg: {
        auto_date_histogram: {
          field: 'foo.attributes.bytes',
        },
      },
    };

    expect(() => {
      validateAndConvertAggregations(['foo'], aggregations, mockMappings);
    }).toThrowErrorMatchingInlineSnapshot(
      `"[someAgg.auto_date_histogram] auto_date_histogram aggregation is not valid (or not registered yet)"`
    );
  });

  it('throws an error when a child aggregation is unknown', () => {
    const aggregations: AggsMap = {
      someAgg: {
        max: {
          field: 'foo.attributes.bytes',
        },
        aggs: {
          unknownAgg: {
            cumulative_cardinality: {
              format: 'format',
            },
          },
        },
      },
    };

    expect(() => {
      validateAndConvertAggregations(['foo'], aggregations, mockMappings);
    }).toThrowErrorMatchingInlineSnapshot(
      `"[someAgg.aggs.unknownAgg.cumulative_cardinality] cumulative_cardinality aggregation is not valid (or not registered yet)"`
    );
  });

  it('throws an error when using a script attribute', () => {
    const aggregations: AggsMap = {
      someAgg: {
        max: {
          field: 'foo.attributes.bytes',
          script: 'This is a bad script',
        },
      },
    };

    expect(() => {
      validateAndConvertAggregations(['foo'], aggregations, mockMappings);
    }).toThrowErrorMatchingInlineSnapshot(
      `"[someAgg.max.script]: Additional properties are not allowed ('script' was unexpected)"`
    );
  });

  it('throws an error when using a script attribute in a nested aggregation', () => {
    const aggregations: AggsMap = {
      someAgg: {
        min: {
          field: 'foo.attributes.bytes',
        },
        aggs: {
          nested: {
            max: {
              field: 'foo.attributes.bytes',
              script: 'This is a bad script',
            },
          },
        },
      },
    };

    expect(() => {
      validateAndConvertAggregations(['foo'], aggregations, mockMappings);
    }).toThrowErrorMatchingInlineSnapshot(
      `"[someAgg.aggs.nested.max.script]: Additional properties are not allowed ('script' was unexpected)"`
    );
  });

  it('throws an error when trying to access a property via {type}.{type}.attributes.{attr}', () => {
    expect(() => {
      validateAndConvertAggregations(
        ['alert'],
        {
          aggName: {
            cardinality: {
              field: 'alert.alert.attributes.actions.group',
            },
            aggs: {
              aggName: {
                max: { field: 'alert.alert.attributes.actions.group' },
              },
            },
          },
        },
        mockMappings
      );
    }).toThrowErrorMatchingInlineSnapshot(
      '"[aggName.cardinality.field] Invalid attribute path: alert.alert.attributes.actions.group"'
    );
  });

  it('throws an error when trying to access a property via {type}.{type}.{attr}', () => {
    expect(() => {
      validateAndConvertAggregations(
        ['alert'],
        {
          aggName: {
            cardinality: {
              field: 'alert.alert.actions.group',
            },
            aggs: {
              aggName: {
                max: { field: 'alert.alert.actions.group' },
              },
            },
          },
        },
        mockMappings
      );
    }).toThrowErrorMatchingInlineSnapshot(
      '"[aggName.cardinality.field] Invalid attribute path: alert.alert.actions.group"'
    );
  });

  it('allows aggregations for root fields', () => {
    const aggregations: AggsMap = {
      types: {
        terms: {
          field: 'type',
        },
      },
    };
    expect(validateAndConvertAggregations(['foo'], aggregations, mockMappings)).toEqual({
      types: {
        terms: {
          field: 'type',
        },
      },
    });
  });
});

describe('validateAndConvertAggregations and the stored ACL', () => {
  const mappingsWithAcl = {
    properties: { ...mockMappings.properties, acl: ACL_MAPPING },
  } as unknown as IndexMapping;

  const validate = (aggs: AggsMap) =>
    validateAndConvertAggregations(['foo'], aggs, mappingsWithAcl);

  it.each(['foo.acl', 'foo.acl.owner.id', 'foo.acl.entries.id', 'acl.owner.id'])(
    'throws for the ACL field %s',
    (field) => {
      expect(() => validate({ aggName: { terms: { field } } })).toThrow(
        `[aggName.terms.field] Invalid attribute path: ${field}`
      );
    }
  );

  it('throws for the ACL as a range key', () => {
    expect(() =>
      validate({
        aggName: {
          filters: {
            filters: {
              recent: {
                bool: { filter: [{ range: { 'acl.entries.added_at': { gte: 'now-1d' } } }] },
              },
            },
          },
        },
      })
    ).toThrow('Invalid attribute path: acl.entries.added_at');
  });

  it.each([
    ['an object sort', { sort: [{ 'acl.general.access': 'asc' }] }],
    ['a sort with options', { sort: [{ 'acl.owner.id': { order: 'asc', missing: '_last' } }] }],
    ['a string sort', { sort: ['acl.owner.id'] }],
    ['a wildcard sort', { sort: ['*'] }],
  ])('throws for the ACL in %s of top_hits', (_, topHits) => {
    expect(() => validate({ top: { top_hits: topHits } } as AggsMap)).toThrow(
      '[top.top_hits] Invalid attribute path'
    );
  });

  // `find` removes the ACL values these options return, so they accept any field, as before.
  it.each([
    ['docvalue_fields', { docvalue_fields: ['*'] }],
    ['docvalue_fields with an ACL field', { docvalue_fields: ['acl.owner.id'] }],
    ['stored_fields', { stored_fields: '*' }],
    ['highlight', { highlight: { fields: { '*': {} } } }],
    ['highlight with an ACL field', { highlight: { fields: { 'acl.*': {} } } }],
  ])('accepts %s in top_hits', (_, topHits) => {
    expect(validate({ top: { top_hits: topHits } })).toEqual({
      top: { top_hits: { ...topHits, _source: { excludes: ['acl', 'acl.*'] } } },
    });
  });

  it('excludes the ACL from the documents that top_hits returns', () => {
    expect(validate({ top: { top_hits: { size: 1 } } })).toEqual({
      top: { top_hits: { size: 1, _source: { excludes: ['acl', 'acl.*'] } } },
    });
    expect(validate({ top: { top_hits: { _source: true } } })).toEqual({
      top: { top_hits: { _source: { excludes: ['acl', 'acl.*'] } } },
    });
    expect(validate({ top: { top_hits: { _source: ['foo.title', 'acl'] } } })).toEqual({
      top: {
        top_hits: { _source: { includes: ['foo.title', 'acl'], excludes: ['acl', 'acl.*'] } },
      },
    });
    expect(validate({ top: { top_hits: { _source: false } } })).toEqual({
      top: { top_hits: { _source: false } },
    });
  });
});
