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

import { buildInlineScriptForPhraseFilter, buildPhraseFilter } from '../phrase';
import expect from '@kbn/expect';
import _ from 'lodash';
import indexPattern from '../../__fixtures__/index_pattern_response.json';
import filterSkeleton from '../../__fixtures__/filter_skeleton';

let expected;

describe('Filter Manager', function() {
  describe('Phrase filter builder', function() {
    beforeEach(() => {
      expected = _.cloneDeep(filterSkeleton);
    });

    it('should be a function', function() {
      expect(buildPhraseFilter).to.be.a(Function);
    });

    it('should return a match query filter when passed a standard field', function() {
      const field = getField(indexPattern, 'bytes');
      expected.query = {
        match: {
          bytes: {
            query: 5,
            type: 'phrase',
          },
        },
      };
      expect(buildPhraseFilter(field, 5, indexPattern)).to.eql(expected);
    });

    it('should return a script filter when passed a scripted field', function() {
      const field = getField(indexPattern, 'script number');
      expected.meta.field = 'script number';
      _.set(expected, 'script.script', {
        source: '(' + field.script + ') == value',
        lang: 'expression',
        params: {
          value: 5,
        },
      });
      expect(buildPhraseFilter(field, 5, indexPattern)).to.eql(expected);
    });
  });

  describe('buildInlineScriptForPhraseFilter', function() {
    it('should wrap painless scripts in a lambda', function() {
      const field = {
        lang: 'painless',
        script: 'return foo;',
      };

      const expected =
        `boolean compare(Supplier s, def v) {return s.get() == v;}` +
        `compare(() -> { return foo; }, params.value);`;

      expect(buildInlineScriptForPhraseFilter(field)).to.be(expected);
    });

    it('should create a simple comparison for other langs', function() {
      const field = {
        lang: 'expression',
        script: 'doc[bytes].value',
      };

      const expected = `(doc[bytes].value) == value`;

      expect(buildInlineScriptForPhraseFilter(field)).to.be(expected);
    });
  });
});

function getField(indexPattern, name) {
  return indexPattern.fields.find(field => field.name === name);
}
