/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { validateGetSavedObjectsAggs } from './aggs_utils';
import { mockMappings } from './filter_utils.test';

describe('Filter Utils', () => {
  describe('#validateGetSavedObjectsAggs', () => {
    test('Validate a simple aggregations', () => {
      expect(
        validateGetSavedObjectsAggs(
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
        validateGetSavedObjectsAggs(
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
        validateGetSavedObjectsAggs(
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
        validateGetSavedObjectsAggs(
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
        validateGetSavedObjectsAggs(
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
        validateGetSavedObjectsAggs(
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
        validateGetSavedObjectsAggs(
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
        validateGetSavedObjectsAggs(
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
        validateGetSavedObjectsAggs(
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
        validateGetSavedObjectsAggs(
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
        validateGetSavedObjectsAggs(
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
        validateGetSavedObjectsAggs(
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
