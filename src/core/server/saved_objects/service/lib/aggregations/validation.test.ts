/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { validateAndConvertAggregations } from './validation';

const mockMappings = {
  properties: {
    updated_at: {
      type: 'date',
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
          type: 'number',
        },
      },
    },
    bar: {
      properties: {
        foo: {
          type: 'text',
        },
        description: {
          type: 'text',
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
    hiddenType: {
      properties: {
        description: {
          type: 'text',
        },
      },
    },
  },
};

describe('Aggregation Utils', () => {
  describe('#validateGetSavedObjectsAggs', () => {
    test('Validate a simple aggregations', () => {
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

    test('Validate a nested field in simple aggregations', () => {
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

    test('Validate a nested aggregations', () => {
      expect(
        validateAndConvertAggregations(
          ['alert'],
          {
            aggName: {
              cardinality: {
                field: 'alert.attributes.actions.group',
                aggs: {
                  aggName: {
                    max: { field: 'alert.attributes.actions.group' },
                  },
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
            aggs: {
              aggName: {
                max: {
                  field: 'alert.actions.group',
                },
              },
            },
          },
        },
      });
    });

    test('Validate an aggregation without the attribute field', () => {
      expect(
        validateAndConvertAggregations(
          ['alert'],
          { aggName: { terms: { 'alert.attributes.actions.group': ['myFriend', 'snoopy'] } } },
          mockMappings
        )
      ).toEqual({
        aggName: {
          terms: {
            'alert.actions.group': ['myFriend', 'snoopy'],
          },
        },
      });
    });

    test('Validate a filter term aggregations', () => {
      expect(
        validateAndConvertAggregations(
          ['foo'],
          { aggName: { filter: { term: { 'foo.attributes.bytes': 10 } } } },
          mockMappings
        )
      ).toEqual({
        aggName: {
          filter: {
            term: { 'foo.attributes.bytes': 10 },
          },
        },
      });
    });

    test('Throw an error when types is not allowed', () => {
      expect(() => {
        validateAndConvertAggregations(
          ['alert'],
          {
            aggName: {
              max: { field: 'foo.attributes.bytes' },
            },
          },
          mockMappings
        );
      }).toThrowErrorMatchingInlineSnapshot(`"This type foo is not allowed: Bad Request"`);
    });

    test('Throw an error when add an invalid attributes ', () => {
      expect(() => {
        validateAndConvertAggregations(
          ['foo'],
          {
            aggName: {
              max: { field: 'foo.attributes.bytes', notValid: 'yesIamNotValid' },
            },
          },
          mockMappings
        );
      }).toThrowErrorMatchingInlineSnapshot(
        `"notValid attribute is not supported in max saved objects aggregation: Bad Request"`
      );
    });

    test('Throw an error when an attributes is not defined correctly', () => {
      expect(() =>
        validateAndConvertAggregations(
          ['alert'],
          {
            aggName: {
              terms: { 'alert.attributes.actions.group': ['myFriend', 'snoopy'], missing: 0 },
            },
          },
          mockMappings
        )
      ).toThrowErrorMatchingInlineSnapshot(`"Invalid value 0 supplied to : string: Bad Request"`);
    });

    test('Throw an error when aggregation is not defined in SavedObjectsAggs', () => {
      expect(() => {
        validateAndConvertAggregations(
          ['foo'],
          {
            aggName: {
              MySuperAgg: { field: 'foo.attributes.bytes' },
            },
          },
          mockMappings
        );
      }).toThrowErrorMatchingInlineSnapshot(
        `"This aggregation MySuperAgg is not valid or we did not defined it yet: Bad Request"`
      );
    });

    test('Throw an error when children aggregation is not defined in SavedObjectsAggs', () => {
      expect(() => {
        validateAndConvertAggregations(
          ['foo'],
          {
            aggName: {
              cardinality: {
                field: 'foo.attributes.bytes',
                aggs: {
                  aggName: {
                    MySuperAgg: { field: 'alert.attributes.actions.group' },
                  },
                },
              },
            },
          },
          mockMappings
        );
      }).toThrowErrorMatchingInlineSnapshot(
        `"This aggregation MySuperAgg is not valid or we did not defined it yet: Bad Request"`
      );
    });

    test('Throw an error when you add the script attribute who are not defined in SavedObjectsAggs', () => {
      expect(() => {
        validateAndConvertAggregations(
          ['alert'],
          {
            aggName: {
              cardinality: { field: 'alert.attributes.actions.group' },
              script: 'I want to access that I should not',
            },
          },
          mockMappings
        );
      }).toThrowErrorMatchingInlineSnapshot(
        `"script attribute is not supported in saved objects aggregation: Bad Request"`
      );
    });

    test('Throw an error when you add the script attribute in a nested aggregations who are not defined in SavedObjectsAggs', () => {
      expect(() => {
        validateAndConvertAggregations(
          ['alert'],
          {
            aggName: {
              cardinality: {
                field: 'alert.attributes.actions.group',
                aggs: {
                  aggName: {
                    max: {
                      field: 'alert.attributes.actions.group',
                      script: 'I want to access that I should not',
                    },
                  },
                },
              },
            },
          },
          mockMappings
        );
      }).toThrowErrorMatchingInlineSnapshot(
        `"script attribute is not supported in saved objects aggregation: Bad Request"`
      );
    });
  });
});
