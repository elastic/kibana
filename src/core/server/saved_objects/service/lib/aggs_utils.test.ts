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
import { SavedObjectsAggs } from './saved_objects_aggs_types';

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
    test('Validate a nested simple aggregations', () => {
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

    test('Throw an error when aggregation is not defined in  SavedObjectsAggs', () => {
      expect(() => {
        validateGetSavedObjectsAggs(
          ['foo'],
          {
            aggName: {
              MySuperAgg: { field: 'foo.attributes.bytes' },
            },
          } as SavedObjectsAggs,
          mockMappings
        );
      }).toThrowErrorMatchingInlineSnapshot(
        `"Invalid value {\\"aggName\\":{\\"MySuperAgg\\":{\\"field\\":\\"foo.attributes.bytes\\"}}}, excess properties: [\\"MySuperAgg\\"]: Bad Request"`
      );
    });

    test('Throw an error when you add attributes who are not defined in SavedObjectsAggs', () => {
      expect(() => {
        validateGetSavedObjectsAggs(
          ['alert'],
          {
            aggName: {
              cardinality: { field: 'alert.attributes.actions.group' },
              script: 'I want to access that I should not',
            },
          } as SavedObjectsAggs,
          mockMappings
        );
      }).toThrowErrorMatchingInlineSnapshot(
        `"Invalid value {\\"aggName\\":{\\"cardinality\\":{\\"field\\":\\"alert.attributes.actions.group\\"},\\"script\\":\\"I want to access that I should not\\"}}, excess properties: [\\"script\\"]: Bad Request"`
      );
    });
  });
});
