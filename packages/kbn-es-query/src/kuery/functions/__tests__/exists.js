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
import * as exists from '../exists';
import { nodeTypes } from '../../node_types';
import _ from 'lodash';
import indexPatternResponse from '../../../__fixtures__/index_pattern_response.json';


let indexPattern;

describe('kuery functions', function () {
  describe('exists', function () {

    beforeEach(() => {
      indexPattern = indexPatternResponse;
    });

    describe('buildNodeParams', function () {
      it('should return a single "arguments" param', function () {
        const result = exists.buildNodeParams('response');
        expect(result).to.only.have.key('arguments');
      });

      it('arguments should contain the provided fieldName as a literal', function () {
        const { arguments: [ arg ] } = exists.buildNodeParams('response');
        expect(arg).to.have.property('type', 'literal');
        expect(arg).to.have.property('value', 'response');
      });
    });

    describe('toElasticsearchQuery', function () {
      it('should return an ES exists query', function () {
        const expected = {
          exists: { field: 'response' }
        };

        const existsNode = nodeTypes.function.buildNode('exists', 'response');
        const result = exists.toElasticsearchQuery(existsNode, indexPattern);
        expect(_.isEqual(expected, result)).to.be(true);
      });

      it('should return an ES exists query without an index pattern', function () {
        const expected = {
          exists: { field: 'response' }
        };

        const existsNode = nodeTypes.function.buildNode('exists', 'response');
        const result = exists.toElasticsearchQuery(existsNode);
        expect(_.isEqual(expected, result)).to.be(true);
      });

      it('should throw an error for scripted fields', function () {
        const existsNode = nodeTypes.function.buildNode('exists', 'script string');
        expect(exists.toElasticsearchQuery)
          .withArgs(existsNode, indexPattern).to.throwException(/Exists query does not support scripted fields/);
      });
    });
  });
});
