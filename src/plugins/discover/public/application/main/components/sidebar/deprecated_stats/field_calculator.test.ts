/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { keys, clone, uniq, filter, map } from 'lodash';
import { getDataTableRecords } from '../../../../../__fixtures__/real_hits';
import { fieldCalculator, FieldCountsParams } from './field_calculator';
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { FieldDetails, ValidFieldDetails } from './types';
import { isValidFieldDetails } from './get_details';

const validateResults = (
  extensions: FieldDetails,
  validate: (extensions: ValidFieldDetails) => void
) => {
  if (isValidFieldDetails(extensions)) {
    validate(extensions);
  } else {
    throw new Error('extensions is not valid');
  }
};

describe('fieldCalculator', function () {
  it('should have a _countMissing that counts nulls & undefineds in an array', function () {
    const values = [
      ['foo', 'bar'],
      'foo',
      'foo',
      undefined,
      ['foo', 'bar'],
      'bar',
      'baz',
      null,
      null,
      null,
      'foo',
      undefined,
    ];
    expect(fieldCalculator._countMissing(values)).toBe(5);
  });

  describe('_groupValues', function () {
    let groups: Record<string, any>;
    let params: any;
    let values: any;
    beforeEach(function () {
      values = [
        ['foo', 'bar'],
        'foo',
        'foo',
        undefined,
        ['foo', 'bar'],
        'bar',
        'baz',
        null,
        null,
        null,
        'foo',
        undefined,
      ];
      params = {};
      groups = fieldCalculator._groupValues(values, params);
    });

    it('should have a _groupValues that counts values', function () {
      expect(groups).toBeInstanceOf(Object);
    });

    it('should throw an error if any value is a plain object', function () {
      expect(function () {
        fieldCalculator._groupValues([{}, true, false], params);
      }).toThrowError();
    });

    it('should handle values with dots in them', function () {
      values = ['0', '0.........', '0.......,.....'];
      params = {};
      groups = fieldCalculator._groupValues(values, params);
      expect(groups[values[0]].count).toBe(1);
      expect(groups[values[1]].count).toBe(1);
      expect(groups[values[2]].count).toBe(1);
    });

    it('should have a a key for value in the array when not grouping array terms', function () {
      expect(keys(groups).length).toBe(3);
      expect(groups.foo).toBeInstanceOf(Object);
      expect(groups.bar).toBeInstanceOf(Object);
      expect(groups.baz).toBeInstanceOf(Object);
    });

    it('should count array terms independently', function () {
      expect(groups['foo,bar']).toBe(undefined);
      expect(groups.foo.count).toBe(5);
      expect(groups.bar.count).toBe(3);
      expect(groups.baz.count).toBe(1);
    });

    describe('grouped array terms', function () {
      beforeEach(function () {
        params.grouped = true;
        groups = fieldCalculator._groupValues(values, params);
      });

      it('should group array terms when passed params.grouped', function () {
        expect(keys(groups).length).toBe(4);
        expect(groups['foo,bar']).toBeInstanceOf(Object);
      });

      it('should contain the original array as the value', function () {
        expect(groups['foo,bar'].value).toEqual(['foo', 'bar']);
      });

      it('should count the pairs separately from the values they contain', function () {
        expect(groups['foo,bar'].count).toBe(2);
        expect(groups.foo.count).toBe(3);
        expect(groups.bar.count).toBe(1);
      });
    });
  });

  describe('getFieldValues', function () {
    let hits: any;

    beforeEach(function () {
      hits = getDataTableRecords(dataView);
    });

    it('Should return an array of values for _source fields', function () {
      const extensions = fieldCalculator.getFieldValues(
        hits,
        dataView.fields.getByName('extension')!
      );
      expect(extensions).toBeInstanceOf(Array);
      expect(filter(extensions, (v) => v === 'html').length).toBe(8);
      expect(uniq(clone(extensions)).sort()).toEqual(['gif', 'html', 'php', 'png']);
    });

    it('Should return an array of values for core meta fields', function () {
      const types = fieldCalculator.getFieldValues(hits, dataView.fields.getByName('_id')!);
      expect(types).toBeInstanceOf(Array);
      expect(types.length).toBe(20);
    });
  });

  describe('getFieldValueCounts', function () {
    let params: FieldCountsParams;
    beforeEach(function () {
      params = {
        hits: getDataTableRecords(dataView),
        field: dataView.fields.getByName('extension')!,
        count: 3,
        dataView,
      };
    });

    it('counts the top 3 values', function () {
      validateResults(fieldCalculator.getFieldValueCounts(params), (extensions) => {
        expect(extensions).toBeInstanceOf(Object);
        expect(extensions.buckets).toBeInstanceOf(Array);
        expect(extensions.buckets.length).toBe(3);
        expect(map(extensions.buckets, 'value')).toEqual(['html', 'php', 'gif']);
      });
    });

    it('fails to analyze geo and attachment types', function () {
      params.field = dataView.fields.getByName('point')!;
      expect(isValidFieldDetails(fieldCalculator.getFieldValueCounts(params))).toBeFalsy();

      params.field = dataView.fields.getByName('area')!;
      expect(isValidFieldDetails(fieldCalculator.getFieldValueCounts(params))).toBeFalsy();

      params.field = dataView.fields.getByName('request_body')!;
      expect(isValidFieldDetails(fieldCalculator.getFieldValueCounts(params))).toBeFalsy();
    });

    it('fails to analyze fields that are in the mapping, but not the hits', function () {
      params.field = dataView.fields.getByName('ip')!;
      expect(isValidFieldDetails(fieldCalculator.getFieldValueCounts(params))).toBeFalsy();
    });

    it('counts the total hits', function () {
      validateResults(fieldCalculator.getFieldValueCounts(params), (extensions) => {
        expect(extensions.total).toBe(params.hits.length);
      });
    });

    it('counts the hits the field exists in', function () {
      params.field = dataView.fields.getByName('phpmemory')!;
      validateResults(fieldCalculator.getFieldValueCounts(params), (extensions) => {
        expect(extensions.exists).toBe(5);
      });
    });
  });
});
