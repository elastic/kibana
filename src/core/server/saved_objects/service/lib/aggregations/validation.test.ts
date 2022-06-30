/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
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

  it('throws an error when an attributes is not respecting its schema definition', () => {
    const aggregations: AggsMap = {
      someAgg: {
        terms: {
          missing: 'expecting a number',
        },
      },
    };

    expect(() =>
      validateAndConvertAggregations(['alert'], aggregations, mockMappings)
    ).toThrowErrorMatchingInlineSnapshot(
      `"[someAgg.terms.missing]: expected value of type [number] but got [string]"`
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
      `"[someAgg.max.script]: definition for this key is missing"`
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
      `"[someAgg.aggs.nested.max.script]: definition for this key is missing"`
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
});
