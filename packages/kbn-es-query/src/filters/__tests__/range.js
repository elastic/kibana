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

import { buildRangeFilter } from '../range';
import expect from '@kbn/expect';
import _ from 'lodash';
import indexPattern from '../../__fixtures__/index_pattern_response.json';
import filterSkeleton from '../../__fixtures__/filter_skeleton';

let expected;

describe('Filter Manager', function() {
  describe('Range filter builder', function() {
    beforeEach(() => {
      expected = _.cloneDeep(filterSkeleton);
    });

    it('should be a function', function() {
      expect(buildRangeFilter).to.be.a(Function);
    });

    it('should return a range filter when passed a standard field', function() {
      const field = getField(indexPattern, 'bytes');
      expected.range = {
        bytes: {
          gte: 1,
          lte: 3,
        },
      };
      expect(buildRangeFilter(field, { gte: 1, lte: 3 }, indexPattern)).to.eql(expected);
    });

    it('should return a script filter when passed a scripted field', function() {
      const field = getField(indexPattern, 'script number');
      expected.meta.field = 'script number';
      _.set(expected, 'script.script', {
        lang: 'expression',
        source: '(' + field.script + ')>=gte && (' + field.script + ')<=lte',
        params: {
          value: '>=1 <=3',
          gte: 1,
          lte: 3,
        },
      });
      expect(buildRangeFilter(field, { gte: 1, lte: 3 }, indexPattern)).to.eql(expected);
    });

    it('should wrap painless scripts in comparator lambdas', function() {
      const field = getField(indexPattern, 'script date');
      const expected =
        `boolean gte(Supplier s, def v) {return !s.get().toInstant().isBefore(Instant.parse(v))} ` +
        `boolean lte(Supplier s, def v) {return !s.get().toInstant().isAfter(Instant.parse(v))}` +
        `gte(() -> { ${field.script} }, params.gte) && ` +
        `lte(() -> { ${field.script} }, params.lte)`;

      const inlineScript = buildRangeFilter(field, { gte: 1, lte: 3 }, indexPattern).script.script
        .source;
      expect(inlineScript).to.be(expected);
    });

    it('should throw an error when gte and gt, or lte and lt are both passed', function() {
      const field = getField(indexPattern, 'script number');
      expect(function() {
        buildRangeFilter(field, { gte: 1, gt: 3 }, indexPattern);
      }).to.throwError();
      expect(function() {
        buildRangeFilter(field, { lte: 1, lt: 3 }, indexPattern);
      }).to.throwError();
    });

    it('to use the right operator for each of gte, gt, lt and lte', function() {
      const field = getField(indexPattern, 'script number');
      _.each({ gte: '>=', gt: '>', lte: '<=', lt: '<' }, function(operator, key) {
        const params = {};
        params[key] = 5;
        const filter = buildRangeFilter(field, params, indexPattern);

        expect(filter.script.script.source).to.be('(' + field.script + ')' + operator + key);
        expect(filter.script.script.params[key]).to.be(5);
        expect(filter.script.script.params.value).to.be(operator + 5);
      });
    });

    describe('when given params where one side is infinite', function() {
      const field = getField(indexPattern, 'script number');
      let filter;
      beforeEach(function() {
        filter = buildRangeFilter(field, { gte: 0, lt: Infinity }, indexPattern);
      });

      describe('returned filter', function() {
        it('is a script filter', function() {
          expect(filter).to.have.property('script');
        });

        it('contain a param for the finite side', function() {
          expect(filter.script.script.params).to.have.property('gte', 0);
        });

        it('does not contain a param for the infinite side', function() {
          expect(filter.script.script.params).not.to.have.property('lt');
        });

        it('does not contain a script condition for the infinite side', function() {
          const field = getField(indexPattern, 'script number');
          const script = field.script;
          expect(filter.script.script.source).to.equal(`(${script})>=gte`);
        });
      });
    });

    describe('when given params where both sides are infinite', function() {
      const field = getField(indexPattern, 'script number');
      let filter;
      beforeEach(function() {
        filter = buildRangeFilter(field, { gte: -Infinity, lt: Infinity }, indexPattern);
      });

      describe('returned filter', function() {
        it('is a match_all filter', function() {
          expect(filter).not.to.have.property('script');
          expect(filter).to.have.property('match_all');
        });

        it('does not contain params', function() {
          expect(filter).not.to.have.property('params');
        });

        it('meta field is set to field name', function() {
          expect(filter.meta.field).to.equal('script number');
        });
      });
    });
  });
});

function getField(indexPattern, name) {
  return indexPattern.fields.find(field => field.name === name);
}
