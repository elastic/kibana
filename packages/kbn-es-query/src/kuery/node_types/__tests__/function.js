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

import * as functionType from '../function';
import _ from 'lodash';
import expect from '@kbn/expect';
import * as isFunction from '../../functions/is';
import indexPatternResponse from '../../../__fixtures__/index_pattern_response.json';

import { nodeTypes } from '../../node_types';

describe('kuery node types', function() {
  describe('function', function() {
    let indexPattern;

    beforeEach(() => {
      indexPattern = indexPatternResponse;
    });

    describe('buildNode', function() {
      it('should return a node representing the given kuery function', function() {
        const result = functionType.buildNode('is', 'extension', 'jpg');
        expect(result).to.have.property('type', 'function');
        expect(result).to.have.property('function', 'is');
        expect(result).to.have.property('arguments');
      });
    });

    describe('buildNodeWithArgumentNodes', function() {
      it('should return a function node with the given argument list untouched', function() {
        const fieldNameLiteral = nodeTypes.literal.buildNode('extension');
        const valueLiteral = nodeTypes.literal.buildNode('jpg');
        const argumentNodes = [fieldNameLiteral, valueLiteral];
        const result = functionType.buildNodeWithArgumentNodes('is', argumentNodes);

        expect(result).to.have.property('type', 'function');
        expect(result).to.have.property('function', 'is');
        expect(result).to.have.property('arguments');
        expect(result.arguments).to.be(argumentNodes);
        expect(result.arguments).to.eql(argumentNodes);
      });
    });

    describe('toElasticsearchQuery', function() {
      it("should return the given function type's ES query representation", function() {
        const node = functionType.buildNode('is', 'extension', 'jpg');
        const expected = isFunction.toElasticsearchQuery(node, indexPattern);
        const result = functionType.toElasticsearchQuery(node, indexPattern);
        expect(_.isEqual(expected, result)).to.be(true);
      });
    });
  });
});
