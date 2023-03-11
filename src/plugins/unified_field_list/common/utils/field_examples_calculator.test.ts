/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { keys, clone, uniq, filter, map, flatten } from 'lodash';
import type { DataView } from '@kbn/data-views-plugin/public';
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { getFieldExampleBuckets, groupValues, getFieldValues } from './field_examples_calculator';

const hitsAsValues: Array<Record<string, string | number | string[] | object>> = [
  {
    extension: 'html',
    bytes: 360.20000000000005,
    '@tags': ['success', 'info'],
    point: [
      {
        type: 'Point',
        coordinates: [100, 20],
      },
    ],
  },
  {
    extension: 'gif',
    bytes: 5848.700000000001,
    '@tags': ['error'],
  },
  {
    extension: 'png',
    bytes: 841.6,
    point: [
      {
        type: 'Point',
        coordinates: [100, 20],
      },
    ],
  },
  {
    extension: 'html',
    bytes: 1626.4,
    point: [
      {
        type: 'Point',
        coordinates: [100, 20],
      },
    ],
  },
  {
    extension: 'php',
    bytes: 2070.6,
    phpmemory: 276080,
  },
  {
    extension: 'gif',
    bytes: 8421.6,
  },
  {
    extension: 'html',
    bytes: 994.8000000000001,
  },
  {
    extension: 'html',
    bytes: 374,
  },
  {
    extension: 'php',
    bytes: 506.09999999999997,
    phpmemory: 67480,
  },
  {
    extension: 'php',
    bytes: 506.09999999999997,
    phpmemory: 67480,
  },
  {
    extension: 'php',
    bytes: 2591.1,
    phpmemory: 345480,
  },
  {
    extension: 'html',
    bytes: 1450,
  },
  {
    extension: 'php',
    bytes: 1803.8999999999999,
    phpmemory: 240520,
  },
  {
    extension: 'html',
    bytes: 1626.4,
  },
  {
    extension: 'gif',
    bytes: 10617.2,
  },
  {
    extension: 'gif',
    bytes: 10961.5,
  },
  {
    extension: 'html',
    bytes: 382.8,
  },
  {
    extension: 'html',
    bytes: 374,
  },
  {
    extension: 'png',
    bytes: 3059.2000000000003,
  },
  {
    extension: 'gif',
    bytes: 10617.2,
  },
];

const hits = hitsAsValues.map((value) => ({
  _index: 'logstash-2014.09.09',
  _id: '1945',
  _score: 1,
  fields: Object.keys(value).reduce(
    (result: Record<string, Array<string | number | object>>, fieldName: string) => {
      const fieldValue = value[fieldName];
      result[fieldName] = Array.isArray(fieldValue) ? fieldValue : [fieldValue];
      return result;
    },
    {}
  ),
}));

describe('fieldExamplesCalculator', function () {
  describe('groupValues', function () {
    let grouped: { groups: Record<string, any>; sampledValues: number };
    let values: any;
    beforeEach(function () {
      values = [
        ['foo', 'bar'],
        'foo',
        'foo',
        undefined,
        ['foo', 'bar', 'bar'],
        'bar',
        'baz',
        null,
        null,
        null,
        'foo',
        undefined,
      ];
      grouped = groupValues(values);
    });

    it('should have a groupValues that counts values', function () {
      expect(grouped.groups).toBeInstanceOf(Object);
      expect(grouped.sampledValues).toBe(9);
    });

    it('should throw an error if any value is a plain object', function () {
      expect(function () {
        groupValues([{}, true, false]);
      }).toThrowError();
    });

    it('should handle values with dots in them', function () {
      values = ['0', '0.........', '0.......,.....'];
      grouped = groupValues(values);
      expect(grouped.groups[values[0]].count).toBe(1);
      expect(grouped.groups[values[1]].count).toBe(1);
      expect(grouped.groups[values[2]].count).toBe(1);
      expect(grouped.sampledValues).toBe(3);
    });

    it('should have a a key for value in the array when not grouping array terms', function () {
      expect(keys(grouped.groups).length).toBe(3);
      expect(grouped.groups.foo).toBeInstanceOf(Object);
      expect(grouped.groups.bar).toBeInstanceOf(Object);
      expect(grouped.groups.baz).toBeInstanceOf(Object);
    });

    it('should count array terms independently', function () {
      expect(grouped.groups['foo,bar']).toBe(undefined);
      expect(grouped.groups.foo.count).toBe(5);
      expect(grouped.groups.bar.count).toBe(3);
      expect(grouped.groups.baz.count).toBe(1);
      expect(grouped.sampledValues).toBe(9);
    });
  });

  describe('getFieldValues', function () {
    it('Should return an array of values for _source fields', function () {
      const values = getFieldValues(hits, dataView.fields.getByName('extension')!, dataView);
      expect(values).toBeInstanceOf(Array);
      expect(
        filter(values, function (v) {
          return v.includes('html');
        }).length
      ).toBe(8);
      expect(uniq(flatten(clone(values))).sort()).toEqual(['gif', 'html', 'php', 'png']);
    });

    it('Should return an array of values for core meta fields', function () {
      const types = getFieldValues(hits, dataView.fields.getByName('_id')!, dataView);
      expect(types).toBeInstanceOf(Array);
      expect(types.length).toBe(20);
    });
  });

  describe('getFieldExampleBuckets', function () {
    let params: { hits: any; field: any; count: number; dataView: DataView };
    beforeEach(function () {
      params = {
        hits,
        field: dataView.fields.getByName('extension'),
        count: 3,
        dataView,
      };
    });

    it('counts the top 3 values', function () {
      const result = getFieldExampleBuckets(params);
      expect(result).toBeInstanceOf(Object);
      expect(result.buckets).toBeInstanceOf(Array);
      expect(result.buckets.length).toBe(3);
      expect(map(result.buckets, 'key')).toEqual(['html', 'php', 'gif']);
    });

    it('analyzes geo types', function () {
      params.field = dataView.fields.getByName('point');
      expect(getFieldExampleBuckets(params)).toEqual({
        buckets: [{ count: 3, key: { coordinates: [100, 20], type: 'Point' } }],
        sampledDocuments: 20,
        sampledValues: 3,
      });

      params.field = dataView.fields.getByName('area');
      expect(getFieldExampleBuckets(params)).toEqual({
        buckets: [],
        sampledDocuments: 20,
        sampledValues: 0,
      });
    });

    it('fails to analyze attachment types', function () {
      params.field = dataView.fields.getByName('request_body');
      expect(() => getFieldExampleBuckets(params)).toThrowError();

      params.field = dataView.fields.getByName('_score');
      expect(() => getFieldExampleBuckets(params)).toThrowError();
    });

    it('fails to analyze fields that are in the mapping, but not the hits', function () {
      params.field = dataView.fields.getByName('machine.os');
      expect(getFieldExampleBuckets(params).buckets).toHaveLength(0);
      expect(getFieldExampleBuckets(params).sampledValues).toBe(0);
    });

    it('counts the total hits', function () {
      expect(getFieldExampleBuckets(params).sampledDocuments).toBe(params.hits.length);
    });

    it('counts total number of values', function () {
      params.field = dataView.fields.getByName('@tags');
      expect(getFieldExampleBuckets(params).sampledValues).toBe(3);
      params.field = dataView.fields.getByName('extension');
      expect(getFieldExampleBuckets(params).sampledValues).toBe(params.hits.length);
      params.field = dataView.fields.getByName('phpmemory');
      expect(getFieldExampleBuckets(params).sampledValues).toBe(5);
    });
  });
});
