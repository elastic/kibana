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

import { each } from 'lodash';
import { buildRangeFilter, getRangeFilterField, RangeFilter } from './range_filter';
import { fields, getField } from '../../index_patterns/mocks';
import { IIndexPattern, IFieldType } from '../../index_patterns';

describe('Range filter builder', () => {
  let indexPattern: IIndexPattern;

  beforeEach(() => {
    indexPattern = {
      id: 'id',
    } as IIndexPattern;
  });

  it('should be a function', () => {
    expect(typeof buildRangeFilter).toBe('function');
  });

  it('should return a range filter when passed a standard field', () => {
    const field = getField('bytes');

    expect(buildRangeFilter(field, { gte: 1, lte: 3 }, indexPattern)).toEqual({
      meta: {
        index: 'id',
        params: {},
      },
      range: {
        bytes: {
          gte: 1,
          lte: 3,
        },
      },
    });
  });

  it('should return a script filter when passed a scripted field', () => {
    const field = getField('script number');

    expect(buildRangeFilter(field, { gte: 1, lte: 3 }, indexPattern)).toEqual({
      meta: {
        field: 'script number',
        index: 'id',
        params: {},
      },
      script: {
        script: {
          lang: 'expression',
          source: '(' + field!.script + ')>=gte && (' + field!.script + ')<=lte',
          params: {
            value: '>=1 <=3',
            gte: 1,
            lte: 3,
          },
        },
      },
    });
  });

  it('should wrap painless scripts in comparator lambdas', () => {
    const field = getField('script date');
    const expected =
      `boolean gte(Supplier s, def v) {return !s.get().toInstant().isBefore(Instant.parse(v))} ` +
      `boolean lte(Supplier s, def v) {return !s.get().toInstant().isAfter(Instant.parse(v))}` +
      `gte(() -> { ${field!.script} }, params.gte) && ` +
      `lte(() -> { ${field!.script} }, params.lte)`;

    const rangeFilter = buildRangeFilter(field, { gte: 1, lte: 3 }, indexPattern);

    expect(rangeFilter.script!.script.source).toBe(expected);
  });

  it('should throw an error when gte and gt, or lte and lt are both passed', () => {
    const field = getField('script number');

    expect(() => {
      buildRangeFilter(field, { gte: 1, gt: 3 }, indexPattern);
    }).toThrowError();

    expect(() => {
      buildRangeFilter(field, { lte: 1, lt: 3 }, indexPattern);
    }).toThrowError();
  });

  it('to use the right operator for each of gte, gt, lt and lte', () => {
    const field = getField('script number');

    each({ gte: '>=', gt: '>', lte: '<=', lt: '<' }, (operator: string, key: any) => {
      const params = {
        [key]: 5,
      };

      const filter = buildRangeFilter(field, params, indexPattern);
      const script = filter.script!.script;

      expect(script.source).toBe('(' + field!.script + ')' + operator + key);
      expect(script.params[key]).toBe(5);
      expect(script.params.value).toBe(operator + 5);
    });
  });

  describe('when given params where one side is infinite', () => {
    let field: IFieldType;
    let filter: RangeFilter;

    beforeEach(() => {
      field = getField('script number');
      filter = buildRangeFilter(field, { gte: 0, lt: Infinity }, indexPattern);
    });

    describe('returned filter', () => {
      it('is a script filter', () => {
        expect(filter).toHaveProperty('script');
      });

      it('contain a param for the finite side', () => {
        expect(filter.script!.script.params).toHaveProperty('gte', 0);
      });

      it('does not contain a param for the infinite side', () => {
        expect(filter.script!.script.params).not.toHaveProperty('lt');
      });

      it('does not contain a script condition for the infinite side', () => {
        const script = field!.script;

        expect(filter.script!.script.source).toEqual(`(${script})>=gte`);
      });
    });
  });

  describe('when given params where both sides are infinite', () => {
    let field: IFieldType;
    let filter: RangeFilter;

    beforeEach(() => {
      field = getField('script number');
      filter = buildRangeFilter(field, { gte: -Infinity, lt: Infinity }, indexPattern);
    });

    describe('returned filter', () => {
      it('is a match_all filter', () => {
        expect(filter).not.toHaveProperty('script');
        expect(filter).toHaveProperty('match_all');
      });

      it('does not contain params', () => {
        expect(filter).not.toHaveProperty('params');
      });

      it('meta field is set to field name', () => {
        expect(filter.meta.field).toEqual('script number');
      });
    });
  });
});

describe('getRangeFilterField', function() {
  const indexPattern: IIndexPattern = ({
    fields,
  } as unknown) as IIndexPattern;

  test('should return the name of the field a range query is targeting', () => {
    const field = indexPattern.fields.find(patternField => patternField.name === 'bytes');
    const filter = buildRangeFilter(field!, {}, indexPattern);
    const result = getRangeFilterField(filter);
    expect(result).toBe('bytes');
  });
});
