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
import * as or from '../or';
import { nodeTypes } from '../../node_types';
import * as ast from '../../ast';
import indexPatternResponse from '../../../__fixtures__/index_pattern_response.json';

let indexPattern;

const childNode1 = nodeTypes.function.buildNode('is', 'machine.os', 'osx');
const childNode2 = nodeTypes.function.buildNode('is', 'extension', 'jpg');

describe('kuery functions', function() {
  describe('or', function() {
    beforeEach(() => {
      indexPattern = indexPatternResponse;
    });

    describe('buildNodeParams', function() {
      it('arguments should contain the unmodified child nodes', function() {
        const result = or.buildNodeParams([childNode1, childNode2]);
        const {
          arguments: [actualChildNode1, actualChildNode2],
        } = result;
        expect(actualChildNode1).to.be(childNode1);
        expect(actualChildNode2).to.be(childNode2);
      });
    });

    describe('toElasticsearchQuery', function() {
      it("should wrap subqueries in an ES bool query's should clause", function() {
        const node = nodeTypes.function.buildNode('or', [childNode1, childNode2]);
        const result = or.toElasticsearchQuery(node, indexPattern);
        expect(result).to.only.have.keys('bool');
        expect(result.bool).to.have.keys('should');
        expect(result.bool.should).to.eql(
          [childNode1, childNode2].map(childNode =>
            ast.toElasticsearchQuery(childNode, indexPattern)
          )
        );
      });

      it('should require one of the clauses to match', function() {
        const node = nodeTypes.function.buildNode('or', [childNode1, childNode2]);
        const result = or.toElasticsearchQuery(node, indexPattern);
        expect(result.bool).to.have.property('minimum_should_match', 1);
      });
    });
  });
});
