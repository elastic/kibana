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
import * as literal from '../literal';

describe('kuery node types', function() {
  describe('literal', function() {
    describe('buildNode', function() {
      it('should return a node representing the given value', function() {
        const result = literal.buildNode('foo');
        expect(result).to.have.property('type', 'literal');
        expect(result).to.have.property('value', 'foo');
      });
    });

    describe('toElasticsearchQuery', function() {
      it('should return the literal value represented by the given node', function() {
        const node = literal.buildNode('foo');
        const result = literal.toElasticsearchQuery(node);
        expect(result).to.be('foo');
      });
    });
  });
});
