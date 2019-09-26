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
import * as namedArg from '../named_arg';
import { nodeTypes } from '../../node_types';

describe('kuery node types', function () {

  describe('named arg', function () {

    describe('buildNode', function () {

      it('should return a node representing a named argument with the given value', function () {
        const result = namedArg.buildNode('fieldName', 'foo');
        expect(result).to.have.property('type', 'namedArg');
        expect(result).to.have.property('name', 'fieldName');
        expect(result).to.have.property('value');

        const literalValue = result.value;
        expect(literalValue).to.have.property('type', 'literal');
        expect(literalValue).to.have.property('value', 'foo');
      });

      it('should support literal nodes as values', function () {
        const value = nodeTypes.literal.buildNode('foo');
        const result = namedArg.buildNode('fieldName', value);
        expect(result.value).to.be(value);
        expect(result.value).to.eql(value);
      });

    });

    describe('toElasticsearchQuery', function () {

      it('should return the argument value represented by the given node', function () {
        const node = namedArg.buildNode('fieldName', 'foo');
        const result = namedArg.toElasticsearchQuery(node);
        expect(result).to.be('foo');
      });

    });

  });

});
