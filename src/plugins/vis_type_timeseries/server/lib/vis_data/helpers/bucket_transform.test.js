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

import { bucketTransform } from './bucket_transform';

describe('src/legacy/core_plugins/metrics/server/lib/vis_data/helpers/bucket_transform.js', () => {
  describe('bucketTransform', () => {
    let bucket;
    let metrics;

    beforeEach(() => {
      bucket = {
        model_type: 'holt_winters',
        alpha: 0.6,
        beta: 0.3,
        gamma: 0.3,
        period: 1,
        multiplicative: true,
        window: 10,
        field: '61ca57f2-469d-11e7-af02-69e470af7417',
        id: 'e815ae00-7881-11e9-9392-cbca66a4cf76',
        type: 'moving_average',
      };
      metrics = [
        {
          id: '61ca57f2-469d-11e7-af02-69e470af7417',
          numerator: 'FlightDelay:true',
          type: 'count',
        },
        {
          model_type: 'holt_winters',
          alpha: 0.6,
          beta: 0.3,
          gamma: 0.3,
          period: 1,
          multiplicative: true,
          window: 10,
          field: '61ca57f2-469d-11e7-af02-69e470af7417',
          id: 'e815ae00-7881-11e9-9392-cbca66a4cf76',
          type: 'moving_average',
        },
      ];
    });

    describe('moving_average', () => {
      test('should return a moving function aggregation API and match a snapshot', () => {
        expect(bucketTransform.moving_average(bucket, metrics)).toMatchSnapshot();
      });
    });

    describe('static', () => {
      test('should return a script with a double value when using decimals', () => {
        expect(bucketTransform.static({ value: '421.12' })).toHaveProperty(
          'bucket_script.script.source',
          '421.12'
        );
      });

      test('should return a long script for integer values', () => {
        expect(bucketTransform.static({ value: '1234567890123' })).toHaveProperty(
          'bucket_script.script.source',
          '1234567890123L'
        );
      });

      test('should not return a long script for exponential values', () => {
        expect(bucketTransform.static({ value: '123123123e12' })).toHaveProperty(
          'bucket_script.script.source',
          '123123123e12'
        );
      });

      test('should return decimal scripts for very large decimals', () => {
        expect(bucketTransform.static({ value: '1234178312312381273123123.11123' })).toHaveProperty(
          'bucket_script.script.source',
          '1234178312312381273123123.11123'
        );
      });
    });
  });

  describe('bucketTransform additional', () => {
    describe('count', () => {
      test('returns count agg', () => {
        const metric = { id: 'test', type: 'count' };
        const fn = bucketTransform.count;
        expect(fn(metric)).toEqual({
          bucket_script: {
            buckets_path: { count: '_count' },
            script: { source: 'count * 1', lang: 'expression' },
            gap_policy: 'skip',
          },
        });
      });
    });

    describe('std metric', () => {
      ['avg', 'max', 'min', 'sum', 'cardinality', 'value_count'].forEach((type) => {
        test(`returns ${type} agg`, () => {
          const metric = { id: 'test', type: type, field: 'cpu.pct' };
          const fn = bucketTransform[type];
          const result = {};
          result[type] = { field: 'cpu.pct' };
          expect(fn(metric)).toEqual(result);
        });
      });

      test('throws error if type is missing', () => {
        const run = () => bucketTransform.avg({ id: 'test', field: 'cpu.pct' });
        expect(run).toThrow(new Error('Metric missing type'));
      });

      test('throws error if field is missing', () => {
        const run = () => bucketTransform.avg({ id: 'test', type: 'avg' });
        expect(run).toThrow(new Error('Metric missing field'));
      });
    });

    describe('extended stats', () => {
      ['std_deviation', 'variance', 'sum_of_squares'].forEach((type) => {
        test(`returns ${type} agg`, () => {
          const fn = bucketTransform[type];
          const metric = { id: 'test', type: type, field: 'cpu.pct' };
          expect(fn(metric)).toEqual({ extended_stats: { field: 'cpu.pct' } });
        });
      });

      test('returns std_deviation agg with sigma', () => {
        const fn = bucketTransform.std_deviation;
        const metric = {
          id: 'test',
          type: 'std_deviation',
          field: 'cpu.pct',
          sigma: 2,
        };
        expect(fn(metric)).toEqual({
          extended_stats: { field: 'cpu.pct', sigma: 2 },
        });
      });

      test('throws error if type is missing', () => {
        const run = () => bucketTransform.std_deviation({ id: 'test', field: 'cpu.pct' });
        expect(run).toThrow(new Error('Metric missing type'));
      });

      test('throws error if field is missing', () => {
        const run = () => bucketTransform.std_deviation({ id: 'test', type: 'avg' });
        expect(run).toThrow(new Error('Metric missing field'));
      });
    });

    describe('percentiles', () => {
      test('returns percentiles agg', () => {
        const metric = {
          id: 'test',
          type: 'percentile',
          field: 'cpu.pct',
          percentiles: [
            { value: 50, mode: 'line' },
            { value: 10, mode: 'band', percentile: 90 },
          ],
        };
        const fn = bucketTransform.percentile;
        expect(fn(metric)).toEqual({
          percentiles: {
            field: 'cpu.pct',
            percents: [50, 10, 90],
          },
        });
      });

      test('define a default 0 value if it was not provided', () => {
        const metric = {
          id: 'test',
          type: 'percentile',
          field: 'cpu.pct',
          percentiles: [
            { value: 50, mode: 'line' },
            { mode: 'line' },
            { value: undefined, mode: 'line' },
            { value: '', mode: 'line' },
            { value: null, mode: 'line' },
            { value: 0, mode: 'line' },
          ],
        };
        expect(bucketTransform.percentile(metric)).toEqual({
          percentiles: {
            field: 'cpu.pct',
            percents: [50, 0, 0, 0, 0, 0],
          },
        });
      });

      test('throws error if type is missing', () => {
        const run = () =>
          bucketTransform.percentile({
            id: 'test',
            field: 'cpu.pct',
            percentiles: [{ value: 50, mode: 'line' }],
          });
        expect(run).toThrow(new Error('Metric missing type'));
      });

      test('throws error if field is missing', () => {
        const run = () =>
          bucketTransform.percentile({
            id: 'test',
            type: 'avg',
            percentiles: [{ value: 50, mode: 'line' }],
          });
        expect(run).toThrow(new Error('Metric missing field'));
      });

      test('throws error if percentiles is missing', () => {
        const run = () =>
          bucketTransform.percentile({
            id: 'test',
            type: 'avg',
            field: 'cpu.pct',
          });
        expect(run).toThrow(new Error('Metric missing percentiles'));
      });
    });

    describe('derivative', () => {
      test('returns derivative agg with defaults', () => {
        const metric = {
          id: '2',
          type: 'derivative',
          field: '1',
        };
        const metrics = [{ id: '1', type: 'max', field: 'cpu.pct' }, metric];
        const fn = bucketTransform.derivative;
        expect(fn(metric, metrics, '10s')).toEqual({
          derivative: {
            buckets_path: '1',
            gap_policy: 'skip',
            unit: '10s',
          },
        });
      });

      test('returns derivative agg with unit', () => {
        const metric = {
          id: '2',
          type: 'derivative',
          field: '1',
          unit: '1s',
        };
        const metrics = [{ id: '1', type: 'max', field: 'cpu.pct' }, metric];
        const fn = bucketTransform.derivative;
        expect(fn(metric, metrics, '10s')).toEqual({
          derivative: {
            buckets_path: '1',
            gap_policy: 'skip',
            unit: '1s',
          },
        });
      });

      test('returns derivative agg with gap_policy', () => {
        const metric = {
          id: '2',
          type: 'derivative',
          field: '1',
          gap_policy: 'zero_fill',
        };
        const metrics = [{ id: '1', type: 'max', field: 'cpu.pct' }, metric];
        const fn = bucketTransform.derivative;
        expect(fn(metric, metrics, '10s')).toEqual({
          derivative: {
            buckets_path: '1',
            gap_policy: 'zero_fill',
            unit: '10s',
          },
        });
      });

      test('throws error if type is missing', () => {
        const run = () => bucketTransform.derivative({ id: 'test', field: 'cpu.pct' });
        expect(run).toThrow(new Error('Metric missing type'));
      });

      test('throws error if field is missing', () => {
        const run = () => bucketTransform.derivative({ id: 'test', type: 'derivative' });
        expect(run).toThrow(new Error('Metric missing field'));
      });
    });

    describe('serial_diff', () => {
      test('returns serial_diff agg with defaults', () => {
        const metric = {
          id: '2',
          type: 'serial_diff',
          field: '1',
        };
        const metrics = [{ id: '1', type: 'max', field: 'cpu.pct' }, metric];
        const fn = bucketTransform.serial_diff;
        expect(fn(metric, metrics)).toEqual({
          serial_diff: {
            buckets_path: '1',
            gap_policy: 'skip',
            lag: 1,
          },
        });
      });

      test('returns serial_diff agg with lag', () => {
        const metric = {
          id: '2',
          type: 'serial_diff',
          field: '1',
          lag: 10,
        };
        const metrics = [{ id: '1', type: 'max', field: 'cpu.pct' }, metric];
        const fn = bucketTransform.serial_diff;
        expect(fn(metric, metrics)).toEqual({
          serial_diff: {
            buckets_path: '1',
            gap_policy: 'skip',
            lag: 10,
          },
        });
      });

      test('returns serial_diff agg with gap_policy', () => {
        const metric = {
          id: '2',
          type: 'serial_diff',
          field: '1',
          gap_policy: 'zero_fill',
        };
        const metrics = [{ id: '1', type: 'max', field: 'cpu.pct' }, metric];
        const fn = bucketTransform.serial_diff;
        expect(fn(metric, metrics)).toEqual({
          serial_diff: {
            buckets_path: '1',
            gap_policy: 'zero_fill',
            lag: 1,
          },
        });
      });

      test('throws error if type is missing', () => {
        const run = () => bucketTransform.serial_diff({ id: 'test', field: 'cpu.pct' });
        expect(run).toThrow(new Error('Metric missing type'));
      });

      test('throws error if field is missing', () => {
        const run = () => bucketTransform.serial_diff({ id: 'test', type: 'serial_diff' });
        expect(run).toThrow(new Error('Metric missing field'));
      });
    });

    describe('cumulative_sum', () => {
      test('returns cumulative_sum agg', () => {
        const metric = { id: '2', type: 'cumulative_sum', field: '1' };
        const metrics = [{ id: '1', type: 'sum', field: 'cpu.pct' }, metric];
        const fn = bucketTransform.cumulative_sum;
        expect(fn(metric, metrics, '10s')).toEqual({
          cumulative_sum: { buckets_path: '1' },
        });
      });

      test('throws error if type is missing', () => {
        const run = () => bucketTransform.cumulative_sum({ id: 'test', field: 'cpu.pct' });
        expect(run).toThrow(new Error('Metric missing type'));
      });

      test('throws error if field is missing', () => {
        const run = () => bucketTransform.cumulative_sum({ id: 'test', type: 'cumulative_sum' });
        expect(run).toThrow(new Error('Metric missing field'));
      });
    });

    describe('calculation', () => {
      test('returns calculation(bucket_script)', () => {
        const metric = {
          id: '2',
          type: 'calculation',
          script: 'params.idle != null ? 1 - params.idle : 0',
          variables: [{ name: 'idle', field: '1' }],
        };
        const metrics = [{ id: '1', type: 'avg', field: 'cpu.idle.pct' }, metric];
        const fn = bucketTransform.calculation;
        expect(fn(metric, metrics, '10s')).toEqual({
          bucket_script: {
            buckets_path: {
              idle: '1',
            },
            gap_policy: 'skip',
            script: {
              source: 'params.idle != null ? 1 - params.idle : 0',
              lang: 'painless',
              params: {
                _interval: 10000,
              },
            },
          },
        });
      });

      test('throws error if variables is missing', () => {
        const run = () =>
          bucketTransform.calculation({
            id: 'test',
            type: 'calculation',
            script: 'params.idle != null ? 1 - params.idle : null',
          });
        expect(run).toThrow(new Error('Metric missing variables'));
      });

      test('throws error if script is missing', () => {
        const run = () =>
          bucketTransform.calculation({
            id: 'test',
            type: 'calculation',
            variables: [{ field: '1', name: 'idle' }],
          });
        expect(run).toThrow(new Error('Metric missing script'));
      });
    });

    describe('positive_only', () => {
      test('returns bucket_script', () => {
        const metric = {
          id: '2',
          type: 'positive_only',
          field: '1',
        };
        const metrics = [{ id: '1', type: 'avg', field: 'cpu.idle.pct' }, metric];
        const fn = bucketTransform.positive_only;
        expect(fn(metric, metrics, '10s')).toEqual({
          bucket_script: {
            buckets_path: {
              value: '1',
            },
            gap_policy: 'skip',
            script: {
              source: 'params.value > 0.0 ? params.value : 0.0',
              lang: 'painless',
            },
          },
        });
      });
    });
  });
});
