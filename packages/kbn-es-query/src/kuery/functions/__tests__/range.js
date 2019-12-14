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
import * as range from '../range';
import { nodeTypes } from '../../node_types';
import indexPatternResponse from '../../../__fixtures__/index_pattern_response.json';

let indexPattern;

describe('kuery functions', function() {
  describe('range', function() {
    beforeEach(() => {
      indexPattern = indexPatternResponse;
    });

    describe('buildNodeParams', function() {
      it('arguments should contain the provided fieldName as a literal', function() {
        const result = range.buildNodeParams('bytes', { gt: 1000, lt: 8000 });
        const {
          arguments: [fieldName],
        } = result;

        expect(fieldName).to.have.property('type', 'literal');
        expect(fieldName).to.have.property('value', 'bytes');
      });

      it('arguments should contain the provided params as named arguments', function() {
        const givenParams = { gt: 1000, lt: 8000, format: 'epoch_millis' };
        const result = range.buildNodeParams('bytes', givenParams);
        const {
          arguments: [, ...params],
        } = result;

        expect(params).to.be.an('array');
        expect(params).to.not.be.empty();

        params.map(param => {
          expect(param).to.have.property('type', 'namedArg');
          expect(['gt', 'lt', 'format'].includes(param.name)).to.be(true);
          expect(param.value.type).to.be('literal');
          expect(param.value.value).to.be(givenParams[param.name]);
        });
      });
    });

    describe('toElasticsearchQuery', function() {
      it("should return an ES range query for the node's field and params", function() {
        const expected = {
          bool: {
            should: [
              {
                range: {
                  bytes: {
                    gt: 1000,
                    lt: 8000,
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        };

        const node = nodeTypes.function.buildNode('range', 'bytes', { gt: 1000, lt: 8000 });
        const result = range.toElasticsearchQuery(node, indexPattern);
        expect(result).to.eql(expected);
      });

      it('should return an ES range query without an index pattern', function() {
        const expected = {
          bool: {
            should: [
              {
                range: {
                  bytes: {
                    gt: 1000,
                    lt: 8000,
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        };

        const node = nodeTypes.function.buildNode('range', 'bytes', { gt: 1000, lt: 8000 });
        const result = range.toElasticsearchQuery(node);
        expect(result).to.eql(expected);
      });

      it('should support wildcard field names', function() {
        const expected = {
          bool: {
            should: [
              {
                range: {
                  bytes: {
                    gt: 1000,
                    lt: 8000,
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        };

        const node = nodeTypes.function.buildNode('range', 'byt*', { gt: 1000, lt: 8000 });
        const result = range.toElasticsearchQuery(node, indexPattern);
        expect(result).to.eql(expected);
      });

      it('should support scripted fields', function() {
        const node = nodeTypes.function.buildNode('range', 'script number', { gt: 1000, lt: 8000 });
        const result = range.toElasticsearchQuery(node, indexPattern);
        expect(result.bool.should[0]).to.have.key('script');
      });

      it('should support date fields without a dateFormat provided', function() {
        const expected = {
          bool: {
            should: [
              {
                range: {
                  '@timestamp': {
                    gt: '2018-01-03T19:04:17',
                    lt: '2018-04-03T19:04:17',
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        };

        const node = nodeTypes.function.buildNode('range', '@timestamp', {
          gt: '2018-01-03T19:04:17',
          lt: '2018-04-03T19:04:17',
        });
        const result = range.toElasticsearchQuery(node, indexPattern);
        expect(result).to.eql(expected);
      });

      it('should support date fields with a dateFormat provided', function() {
        const config = { dateFormatTZ: 'America/Phoenix' };
        const expected = {
          bool: {
            should: [
              {
                range: {
                  '@timestamp': {
                    gt: '2018-01-03T19:04:17',
                    lt: '2018-04-03T19:04:17',
                    time_zone: 'America/Phoenix',
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        };

        const node = nodeTypes.function.buildNode('range', '@timestamp', {
          gt: '2018-01-03T19:04:17',
          lt: '2018-04-03T19:04:17',
        });
        const result = range.toElasticsearchQuery(node, indexPattern, config);
        expect(result).to.eql(expected);
      });
    });
  });
});
