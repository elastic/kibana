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

import { validateGetSavedObjectAggs } from './aggs_utils';
import { mockMappings } from './filter_utils.test';

describe('Filter Utils', () => {
  describe('#validateGetSavedObjectAggs', () => {
    test('Validate a simple aggregations', () => {
      expect(
        validateGetSavedObjectAggs(
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
        validateGetSavedObjectAggs(
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
        validateGetSavedObjectAggs(
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

    test('Throw an error when aggregation is not defined in  SavedObjectAggs', () => {
      expect(() => {
        validateGetSavedObjectAggs(
          ['foo'],
          {
            aggName: {
              MySuperAgg: { field: 'foo.attributes.bytes' },
            },
          },
          mockMappings
        );
      }).toThrowErrorMatchingInlineSnapshot(
        `"Invalid value {\\"aggName\\":{\\"MySuperAgg\\":{\\"field\\":\\"foo.attributes.bytes\\"}}} supplied to : { [K in string]: ((Partial<{ filter: { term: { [K in string]: string } }, histogram: ({ field: string } & { interval: number } & Partial<{ min_doc_count: number, extended_bounds: { min: number, max: number }, keyed: boolean, missing: number, order: { [K in string]: desc } }>), terms: ({ field: string } & Partial<{ field: string, size: number, show_term_doc_count_error: boolean, order: { [K in string]: desc } }>) }> & Partial<{ avg: { field: string }, weighted_avg: ({ value: ({ field: string } & Partial<{ missing: number }>), weight: ({ field: string } & Partial<{ missing: number }>) } & Partial<{ format: string, value_type: string }>), cardinality: { field: string }, max: ({ field: string } & Partial<{ missing: number }>), min: ({ field: string } & Partial<{ missing: number }>), top_hits: Partial<{ explain: boolean, from: string, highlight: any, seq_no_primary_term: boolean, size: number, sort: any, stored_fields: Array<string>, version: boolean, _name: string, _source: Partial<{ includes: Array<string>, excludes: Array<string> }> }> }>) & Partial<{ aggs: (Partial<{ filter: { term: { [K in string]: string } }, histogram: ({ field: string } & { interval: number } & Partial<{ min_doc_count: number, extended_bounds: { min: number, max: number }, keyed: boolean, missing: number, order: { [K in string]: desc } }>), terms: ({ field: string } & Partial<{ field: string, size: number, show_term_doc_count_error: boolean, order: { [K in string]: desc } }>) }> & Partial<{ avg: { field: string }, weighted_avg: ({ value: ({ field: string } & Partial<{ missing: number }>), weight: ({ field: string } & Partial<{ missing: number }>) } & Partial<{ format: string, value_type: string }>), cardinality: { field: string }, max: ({ field: string } & Partial<{ missing: number }>), min: ({ field: string } & Partial<{ missing: number }>), top_hits: Partial<{ explain: boolean, from: string, highlight: any, seq_no_primary_term: boolean, size: number, sort: any, stored_fields: Array<string>, version: boolean, _name: string, _source: Partial<{ includes: Array<string>, excludes: Array<string> }> }> }>) }>) }, excess properties: [\\"MySuperAgg\\"]: Bad Request"`
      );
    });

    test('Throw an error when you add attributes who are not defined in SavedObjectAggs', () => {
      expect(() => {
        validateGetSavedObjectAggs(
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
        `"Invalid value {\\"aggName\\":{\\"cardinality\\":{\\"field\\":\\"alert.attributes.actions.group\\"},\\"script\\":\\"I want to access that I should not\\"}} supplied to : { [K in string]: ((Partial<{ filter: { term: { [K in string]: string } }, histogram: ({ field: string } & { interval: number } & Partial<{ min_doc_count: number, extended_bounds: { min: number, max: number }, keyed: boolean, missing: number, order: { [K in string]: desc } }>), terms: ({ field: string } & Partial<{ field: string, size: number, show_term_doc_count_error: boolean, order: { [K in string]: desc } }>) }> & Partial<{ avg: { field: string }, weighted_avg: ({ value: ({ field: string } & Partial<{ missing: number }>), weight: ({ field: string } & Partial<{ missing: number }>) } & Partial<{ format: string, value_type: string }>), cardinality: { field: string }, max: ({ field: string } & Partial<{ missing: number }>), min: ({ field: string } & Partial<{ missing: number }>), top_hits: Partial<{ explain: boolean, from: string, highlight: any, seq_no_primary_term: boolean, size: number, sort: any, stored_fields: Array<string>, version: boolean, _name: string, _source: Partial<{ includes: Array<string>, excludes: Array<string> }> }> }>) & Partial<{ aggs: (Partial<{ filter: { term: { [K in string]: string } }, histogram: ({ field: string } & { interval: number } & Partial<{ min_doc_count: number, extended_bounds: { min: number, max: number }, keyed: boolean, missing: number, order: { [K in string]: desc } }>), terms: ({ field: string } & Partial<{ field: string, size: number, show_term_doc_count_error: boolean, order: { [K in string]: desc } }>) }> & Partial<{ avg: { field: string }, weighted_avg: ({ value: ({ field: string } & Partial<{ missing: number }>), weight: ({ field: string } & Partial<{ missing: number }>) } & Partial<{ format: string, value_type: string }>), cardinality: { field: string }, max: ({ field: string } & Partial<{ missing: number }>), min: ({ field: string } & Partial<{ missing: number }>), top_hits: Partial<{ explain: boolean, from: string, highlight: any, seq_no_primary_term: boolean, size: number, sort: any, stored_fields: Array<string>, version: boolean, _name: string, _source: Partial<{ includes: Array<string>, excludes: Array<string> }> }> }>) }>) }, excess properties: [\\"script\\"]: Bad Request"`
      );
    });
  });
});
