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

import { getFields } from '../../utils/get_fields';
import expect from '@kbn/expect';
import indexPatternResponse from '../../../../__fixtures__/index_pattern_response.json';

import { nodeTypes } from '../../..';

let indexPattern;

describe('getFields', function() {
  beforeEach(() => {
    indexPattern = indexPatternResponse;
  });

  describe('field names without a wildcard', function() {
    it('should return an empty array if the field does not exist in the index pattern', function() {
      const fieldNameNode = nodeTypes.literal.buildNode('nonExistentField');
      const expected = [];
      const actual = getFields(fieldNameNode, indexPattern);
      expect(actual).to.eql(expected);
    });

    it('should return the single matching field in an array', function() {
      const fieldNameNode = nodeTypes.literal.buildNode('extension');
      const results = getFields(fieldNameNode, indexPattern);
      expect(results).to.be.an('array');
      expect(results).to.have.length(1);
      expect(results[0].name).to.be('extension');
    });

    it('should not match a wildcard in a literal node', function() {
      const indexPatternWithWildField = {
        title: 'wildIndex',
        fields: [
          {
            name: 'foo*',
          },
        ],
      };

      const fieldNameNode = nodeTypes.literal.buildNode('foo*');
      const results = getFields(fieldNameNode, indexPatternWithWildField);
      expect(results).to.be.an('array');
      expect(results).to.have.length(1);
      expect(results[0].name).to.be('foo*');

      // ensure the wildcard is not actually being parsed
      const expected = [];
      const actual = getFields(nodeTypes.literal.buildNode('fo*'), indexPatternWithWildField);
      expect(actual).to.eql(expected);
    });
  });

  describe('field name patterns with a wildcard', function() {
    it('should return an empty array if it does not match any fields in the index pattern', function() {
      const fieldNameNode = nodeTypes.wildcard.buildNode('nonExistent*');
      const expected = [];
      const actual = getFields(fieldNameNode, indexPattern);
      expect(actual).to.eql(expected);
    });

    it('should return all fields that match the pattern in an array', function() {
      const fieldNameNode = nodeTypes.wildcard.buildNode('machine*');
      const results = getFields(fieldNameNode, indexPattern);
      expect(results).to.be.an('array');
      expect(results).to.have.length(2);
      expect(
        results.find(field => {
          return field.name === 'machine.os';
        })
      ).to.be.ok();
      expect(
        results.find(field => {
          return field.name === 'machine.os.raw';
        })
      ).to.be.ok();
    });
  });
});
