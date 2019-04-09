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

import expect from '@kbn/expect';
import * as is from '../is';
import { nodeTypes } from '../../node_types';
import indexPatternResponse from '../../../__fixtures__/index_pattern_response.json';

let indexPattern;

describe('kuery functions', function () {

  describe('is', function () {


    beforeEach(() => {
      indexPattern = indexPatternResponse;
    });

    describe('buildNodeParams', function () {

      it('fieldName and value should be required arguments', function () {
        expect(is.buildNodeParams).to.throwException(/fieldName is a required argument/);
        expect(is.buildNodeParams).withArgs('foo').to.throwException(/value is a required argument/);
      });

      it('arguments should contain the provided fieldName and value as literals', function () {
        const { arguments: [fieldName, value] } = is.buildNodeParams('response', 200);

        expect(fieldName).to.have.property('type', 'literal');
        expect(fieldName).to.have.property('value', 'response');

        expect(value).to.have.property('type', 'literal');
        expect(value).to.have.property('value', 200);
      });

      it('should detect wildcards in the provided arguments', function () {
        const { arguments: [fieldName, value] } = is.buildNodeParams('machine*', 'win*');

        expect(fieldName).to.have.property('type', 'wildcard');
        expect(value).to.have.property('type', 'wildcard');
      });

      it('should default to a non-phrase query', function () {
        const { arguments: [, , isPhrase] } = is.buildNodeParams('response', 200);
        expect(isPhrase.value).to.be(false);
      });

      it('should allow specification of a phrase query', function () {
        const { arguments: [, , isPhrase] } = is.buildNodeParams('response', 200, true);
        expect(isPhrase.value).to.be(true);
      });
    });

    describe('toElasticsearchQuery', function () {

      it('should return an ES match_all query when fieldName and value are both "*"', function () {
        const expected = {
          match_all: {}
        };

        const node = nodeTypes.function.buildNode('is', '*', '*');
        const result = is.toElasticsearchQuery(node, indexPattern);
        expect(result).to.eql(expected);
      });

      it('should return an ES multi_match query using default_field when fieldName is null', function () {
        const expected = {
          multi_match: {
            query: 200,
            type: 'best_fields',
            lenient: true,
          }
        };

        const node = nodeTypes.function.buildNode('is', null, 200);
        const result = is.toElasticsearchQuery(node, indexPattern);
        expect(result).to.eql(expected);
      });

      it('should return an ES query_string query using default_field when fieldName is null and value contains a wildcard', function () {
        const expected = {
          query_string: {
            query: 'jpg*',
          }
        };

        const node = nodeTypes.function.buildNode('is', null, 'jpg*');
        const result = is.toElasticsearchQuery(node, indexPattern);
        expect(result).to.eql(expected);
      });

      it('should return an ES bool query with a sub-query for each field when fieldName is "*"', function () {
        const node = nodeTypes.function.buildNode('is', '*', 200);
        const result = is.toElasticsearchQuery(node, indexPattern);
        expect(result).to.have.property('bool');
        expect(result.bool.should).to.have.length(indexPattern.fields.length);
      });

      it('should return an ES exists query when value is "*"', function () {
        const expected = {
          bool: {
            should: [
              { exists: { field: 'extension' } },
            ],
            minimum_should_match: 1
          }
        };

        const node = nodeTypes.function.buildNode('is', 'extension', '*');
        const result = is.toElasticsearchQuery(node, indexPattern);
        expect(result).to.eql(expected);
      });

      it('should return an ES match query when a concrete fieldName and value are provided', function () {
        const expected = {
          bool: {
            should: [
              { match: { extension: 'jpg' } },
            ],
            minimum_should_match: 1
          }
        };

        const node = nodeTypes.function.buildNode('is', 'extension', 'jpg');
        const result = is.toElasticsearchQuery(node, indexPattern);
        expect(result).to.eql(expected);
      });

      it('should return an ES match query when a concrete fieldName and value are provided without an index pattern', function () {
        const expected = {
          bool: {
            should: [
              { match: { extension: 'jpg' } },
            ],
            minimum_should_match: 1
          }
        };

        const node = nodeTypes.function.buildNode('is', 'extension', 'jpg');
        const result = is.toElasticsearchQuery(node);
        expect(result).to.eql(expected);
      });

      it('should support creation of phrase queries', function () {
        const expected = {
          bool: {
            should: [
              { match_phrase: { extension: 'jpg' } },
            ],
            minimum_should_match: 1
          }
        };

        const node = nodeTypes.function.buildNode('is', 'extension', 'jpg', true);
        const result = is.toElasticsearchQuery(node, indexPattern);
        expect(result).to.eql(expected);
      });

      it('should create a query_string query for wildcard values', function () {
        const expected = {
          bool: {
            should: [
              {
                query_string: {
                  fields: ['extension'],
                  query: 'jpg*'
                }
              },
            ],
            minimum_should_match: 1
          }
        };

        const node = nodeTypes.function.buildNode('is', 'extension', 'jpg*');
        const result = is.toElasticsearchQuery(node, indexPattern);
        expect(result).to.eql(expected);
      });

      it('should support scripted fields', function () {
        const node = nodeTypes.function.buildNode('is', 'script string', 'foo');
        const result = is.toElasticsearchQuery(node, indexPattern);
        expect(result.bool.should[0]).to.have.key('script');
      });

      it('should support date fields without a dateFormat provided', function () {
        const expected = {
          bool: {
            should: [
              {
                range: {
                  '@timestamp': {
                    gte: '2018-04-03T19:04:17',
                    lte: '2018-04-03T19:04:17',
                  }
                }
              }
            ],
            minimum_should_match: 1
          }
        };

        const node = nodeTypes.function.buildNode('is', '@timestamp', '"2018-04-03T19:04:17"');
        const result = is.toElasticsearchQuery(node, indexPattern);
        expect(result).to.eql(expected);
      });

      it('should support date fields with a dateFormat provided', function () {
        const config = { dateFormatTZ: 'America/Phoenix' };
        const expected = {
          bool: {
            should: [
              {
                range: {
                  '@timestamp': {
                    gte: '2018-04-03T19:04:17',
                    lte: '2018-04-03T19:04:17',
                    time_zone: 'America/Phoenix',
                  }
                }
              }
            ],
            minimum_should_match: 1
          }
        };

        const node = nodeTypes.function.buildNode('is', '@timestamp', '"2018-04-03T19:04:17"');
        const result = is.toElasticsearchQuery(node, indexPattern, config);
        expect(result).to.eql(expected);
      });

    });
  });
});
