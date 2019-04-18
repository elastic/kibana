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
import * as not from '../not';
import { nodeTypes } from '../../node_types';
import * as ast from '../../ast';
import indexPatternResponse from '../../../__fixtures__/index_pattern_response.json';

let indexPattern;

const childNode = nodeTypes.function.buildNode('is', 'extension', 'jpg');

describe('kuery functions', function () {

  describe('not', function () {

    beforeEach(() => {
      indexPattern = indexPatternResponse;
    });

    describe('buildNodeParams', function () {

      it('arguments should contain the unmodified child node', function () {
        const { arguments: [ actualChild ] } = not.buildNodeParams(childNode);
        expect(actualChild).to.be(childNode);
      });


    });

    describe('toElasticsearchQuery', function () {

      it('should wrap a subquery in an ES bool query\'s must_not clause', function () {
        const node = nodeTypes.function.buildNode('not', childNode);
        const result = not.toElasticsearchQuery(node, indexPattern);
        expect(result).to.only.have.keys('bool');
        expect(result.bool).to.only.have.keys('must_not');
        expect(result.bool.must_not).to.eql(ast.toElasticsearchQuery(childNode, indexPattern));
      });

    });
  });
});
