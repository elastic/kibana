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
import * as nested from '../nested';
import { nodeTypes } from '../../node_types';
import * as ast from '../../ast';
import { fields } from '../../../../index_patterns/mocks';

const childNode = nodeTypes.function.buildNode('is', 'child', 'foo');

describe('kuery functions', function () {
  describe('nested', function () {
    let indexPattern;

    beforeEach(() => {
      indexPattern = {
        fields,
      };
    });

    describe('buildNodeParams', function () {

      it('arguments should contain the unmodified child nodes', function () {
        const result = nested.buildNodeParams('nestedField', childNode);
        const { arguments: [ resultPath, resultChildNode ] } = result;
        expect(ast.toElasticsearchQuery(resultPath)).to.be('nestedField');
        expect(resultChildNode).to.be(childNode);
      });
    });

    describe('toElasticsearchQuery', function () {

      it('should wrap subqueries in an ES nested query', function () {
        const node = nodeTypes.function.buildNode('nested', 'nestedField', childNode);
        const result = nested.toElasticsearchQuery(node, indexPattern);
        expect(result).to.only.have.keys('nested');
        expect(result.nested.path).to.be('nestedField');
        expect(result.nested.score_mode).to.be('none');
      });

      it('should pass the nested path to subqueries so the full field name can be used', function () {
        const node = nodeTypes.function.buildNode('nested', 'nestedField', childNode);
        const result = nested.toElasticsearchQuery(node, indexPattern);
        const expectedSubQuery = ast.toElasticsearchQuery(
          nodeTypes.function.buildNode('is', 'nestedField.child', 'foo')
        );
        expect(result.nested.query).to.eql(expectedSubQuery);
      });

    });
  });
});
