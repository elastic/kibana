/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { each } from 'lodash';
import { DataViewBase, DataViewFieldBase } from '../../es_query';
import { fields, getField } from '../stubs';
import {
  buildRangeFilter,
  getRangeFilterField,
  RangeFilter,
  ScriptedRangeFilter,
} from './range_filter';

describe('Range filter builder', () => {
  let indexPattern: DataViewBase;

  beforeEach(() => {
    indexPattern = {
      id: 'id',
    } as DataViewBase;
  });

  it('should be a function', () => {
    expect(typeof buildRangeFilter).toBe('function');
  });

  it('should return a range filter when passed a standard field', () => {
    const field = getField('bytes');

    expect(buildRangeFilter(field!, { gte: 1, lte: 3 }, indexPattern)).toEqual({
      meta: {
        field: 'bytes',
        index: 'id',
        params: {},
      },
      query: {
        range: {
          bytes: {
            gte: 1,
            lte: 3,
          },
        },
      },
    });
  });

  it('should return a script filter when passed a scripted field', () => {
    const field = getField('script number');

    expect(buildRangeFilter(field!, { gte: 1, lte: 3 }, indexPattern)).toEqual({
      meta: {
        field: 'script number',
        index: 'id',
        params: {},
      },
      query: {
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
      },
    });
  });

  it('should convert strings to numbers if the field is scripted and type number', () => {
    const field = getField('script number');

    expect(buildRangeFilter(field!, { gte: '1', lte: '3' }, indexPattern)).toEqual({
      meta: {
        field: 'script number',
        index: 'id',
        params: {},
      },
      query: {
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

    const rangeFilter = buildRangeFilter(
      field!,
      { gte: 1, lte: 3 },
      indexPattern
    ) as ScriptedRangeFilter;
    expect(rangeFilter.query.script.script.source).toBe(expected);
  });

  it('should throw an error when gte and gt, or lte and lt are both passed', () => {
    const field = getField('script number');

    expect(() => {
      buildRangeFilter(field!, { gte: 1, gt: 3 }, indexPattern);
    }).toThrowError();

    expect(() => {
      buildRangeFilter(field!, { lte: 1, lt: 3 }, indexPattern);
    }).toThrowError();
  });

  it('to use the right operator for each of gte, gt, lt and lte', () => {
    const field = getField('script number');

    each({ gte: '>=', gt: '>', lte: '<=', lt: '<' }, (operator: string, key: any) => {
      const params = {
        [key]: 5,
      };

      const filter = buildRangeFilter(field!, params, indexPattern) as ScriptedRangeFilter;
      const script = filter.query.script!.script;

      expect(script.source).toBe('(' + field!.script + ')' + operator + key);
      expect(script.params?.[key]).toBe(5);
      expect(script.params?.value).toBe(operator + 5);
    });
  });

  describe('when given params where one side is infinite', () => {
    let field: DataViewFieldBase;
    let filter: ScriptedRangeFilter;

    beforeEach(() => {
      field = getField('script number')!;
      filter = buildRangeFilter(
        field,
        { gte: 0, lt: Infinity },
        indexPattern
      ) as ScriptedRangeFilter;
    });

    describe('returned filter', () => {
      it('is a script filter', () => {
        expect(filter.query).toHaveProperty('script');
      });

      it('contain a param for the finite side', () => {
        expect(filter.query.script!.script.params).toHaveProperty('gte', 0);
      });

      it('does not contain a param for the infinite side', () => {
        expect(filter.query.script!.script.params).not.toHaveProperty('lt');
      });

      it('does not contain a script condition for the infinite side', () => {
        const script = field!.script;

        expect(filter.query.script!.script.source).toEqual(`(${script})>=gte`);
      });
    });
  });

  describe('when given params where both sides are infinite', () => {
    let field: DataViewFieldBase;
    let filter: ScriptedRangeFilter;

    beforeEach(() => {
      field = getField('script number')!;
      filter = buildRangeFilter(
        field,
        { gte: -Infinity, lt: Infinity },
        indexPattern
      ) as ScriptedRangeFilter;
    });

    describe('returned filter', () => {
      it('is a match_all filter', () => {
        expect(filter.query).not.toHaveProperty('script');
        expect(filter.query).toHaveProperty('match_all');
      });

      it('does not contain params', () => {
        expect(filter.query).not.toHaveProperty('params');
      });

      it('meta field is set to field name', () => {
        expect(filter.meta.field).toEqual('script number');
      });
    });
  });
});

describe('getRangeFilterField', function () {
  const indexPattern: DataViewBase = {
    fields,
  } as unknown as DataViewBase;

  test('should return the name of the field a range query is targeting', () => {
    const field = indexPattern.fields.find((patternField) => patternField.name === 'bytes');
    const filter = buildRangeFilter(field!, {}, indexPattern) as RangeFilter;
    const result = getRangeFilterField(filter);
    expect(result).toBe('bytes');
  });
});
