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

import { expect } from 'chai';
import { bucketTransform } from '../../helpers/bucket_transform';

describe('bucketTransform', () => {
  describe('count', () => {
    it('returns count agg', () => {
      const metric = { id: 'test', type: 'count' };
      const fn = bucketTransform.count;
      expect(fn(metric)).to.eql({
        bucket_script: {
          buckets_path: { count: '_count' },
          script: { source: 'count * 1', lang: 'expression' },
          gap_policy: 'skip',
        },
      });
    });
  });

  describe('std metric', () => {
    ['avg', 'max', 'min', 'sum', 'cardinality', 'value_count'].forEach(type => {
      it(`returns ${type} agg`, () => {
        const metric = { id: 'test', type: type, field: 'cpu.pct' };
        const fn = bucketTransform[type];
        const result = {};
        result[type] = { field: 'cpu.pct' };
        expect(fn(metric)).to.eql(result);
      });
    });

    it('throws error if type is missing', () => {
      const run = () => bucketTransform.avg({ id: 'test', field: 'cpu.pct' });
      expect(run).to.throw(Error, 'Metric missing type');
    });

    it('throws error if field is missing', () => {
      const run = () => bucketTransform.avg({ id: 'test', type: 'avg' });
      expect(run).to.throw(Error, 'Metric missing field');
    });
  });

  describe('extended stats', () => {
    ['std_deviation', 'variance', 'sum_of_squares'].forEach(type => {
      it(`returns ${type} agg`, () => {
        const fn = bucketTransform[type];
        const metric = { id: 'test', type: type, field: 'cpu.pct' };
        expect(fn(metric)).to.eql({ extended_stats: { field: 'cpu.pct' } });
      });
    });

    it('returns std_deviation agg with sigma', () => {
      const fn = bucketTransform.std_deviation;
      const metric = {
        id: 'test',
        type: 'std_deviation',
        field: 'cpu.pct',
        sigma: 2,
      };
      expect(fn(metric)).to.eql({
        extended_stats: { field: 'cpu.pct', sigma: 2 },
      });
    });

    it('throws error if type is missing', () => {
      const run = () => bucketTransform.std_deviation({ id: 'test', field: 'cpu.pct' });
      expect(run).to.throw(Error, 'Metric missing type');
    });

    it('throws error if field is missing', () => {
      const run = () => bucketTransform.std_deviation({ id: 'test', type: 'avg' });
      expect(run).to.throw(Error, 'Metric missing field');
    });
  });

  describe('percentiles', () => {
    it('returns percentiles agg', () => {
      const metric = {
        id: 'test',
        type: 'percentile',
        field: 'cpu.pct',
        percentiles: [{ value: 50, mode: 'line' }, { value: 10, mode: 'band', percentile: 90 }],
      };
      const fn = bucketTransform.percentile;
      expect(fn(metric)).to.eql({
        percentiles: {
          field: 'cpu.pct',
          percents: [50, 10, 90],
        },
      });
    });

    it('define a default 0 value if it was not provided', () => {
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
      expect(bucketTransform.percentile(metric)).to.eql({
        percentiles: {
          field: 'cpu.pct',
          percents: [50, 0, 0, 0, 0, 0],
        },
      });
    });

    it('throws error if type is missing', () => {
      const run = () =>
        bucketTransform.percentile({
          id: 'test',
          field: 'cpu.pct',
          percentiles: [{ value: 50, mode: 'line' }],
        });
      expect(run).to.throw(Error, 'Metric missing type');
    });

    it('throws error if field is missing', () => {
      const run = () =>
        bucketTransform.percentile({
          id: 'test',
          type: 'avg',
          percentiles: [{ value: 50, mode: 'line' }],
        });
      expect(run).to.throw(Error, 'Metric missing field');
    });

    it('throws error if percentiles is missing', () => {
      const run = () =>
        bucketTransform.percentile({
          id: 'test',
          type: 'avg',
          field: 'cpu.pct',
        });
      expect(run).to.throw(Error, 'Metric missing percentiles');
    });
  });

  describe('derivative', () => {
    it('returns derivative agg with defaults', () => {
      const metric = {
        id: '2',
        type: 'derivative',
        field: '1',
      };
      const metrics = [{ id: '1', type: 'max', field: 'cpu.pct' }, metric];
      const fn = bucketTransform.derivative;
      expect(fn(metric, metrics, '10s')).is.eql({
        derivative: {
          buckets_path: '1',
          gap_policy: 'skip',
          unit: '10s',
        },
      });
    });

    it('returns derivative agg with unit', () => {
      const metric = {
        id: '2',
        type: 'derivative',
        field: '1',
        unit: '1s',
      };
      const metrics = [{ id: '1', type: 'max', field: 'cpu.pct' }, metric];
      const fn = bucketTransform.derivative;
      expect(fn(metric, metrics, '10s')).is.eql({
        derivative: {
          buckets_path: '1',
          gap_policy: 'skip',
          unit: '1s',
        },
      });
    });

    it('returns derivative agg with gap_policy', () => {
      const metric = {
        id: '2',
        type: 'derivative',
        field: '1',
        gap_policy: 'zero_fill',
      };
      const metrics = [{ id: '1', type: 'max', field: 'cpu.pct' }, metric];
      const fn = bucketTransform.derivative;
      expect(fn(metric, metrics, '10s')).is.eql({
        derivative: {
          buckets_path: '1',
          gap_policy: 'zero_fill',
          unit: '10s',
        },
      });
    });

    it('throws error if type is missing', () => {
      const run = () => bucketTransform.derivative({ id: 'test', field: 'cpu.pct' });
      expect(run).to.throw(Error, 'Metric missing type');
    });

    it('throws error if field is missing', () => {
      const run = () => bucketTransform.derivative({ id: 'test', type: 'derivative' });
      expect(run).to.throw(Error, 'Metric missing field');
    });
  });

  describe('serial_diff', () => {
    it('returns serial_diff agg with defaults', () => {
      const metric = {
        id: '2',
        type: 'serial_diff',
        field: '1',
      };
      const metrics = [{ id: '1', type: 'max', field: 'cpu.pct' }, metric];
      const fn = bucketTransform.serial_diff;
      expect(fn(metric, metrics)).is.eql({
        serial_diff: {
          buckets_path: '1',
          gap_policy: 'skip',
          lag: 1,
        },
      });
    });

    it('returns serial_diff agg with lag', () => {
      const metric = {
        id: '2',
        type: 'serial_diff',
        field: '1',
        lag: 10,
      };
      const metrics = [{ id: '1', type: 'max', field: 'cpu.pct' }, metric];
      const fn = bucketTransform.serial_diff;
      expect(fn(metric, metrics)).is.eql({
        serial_diff: {
          buckets_path: '1',
          gap_policy: 'skip',
          lag: 10,
        },
      });
    });

    it('returns serial_diff agg with gap_policy', () => {
      const metric = {
        id: '2',
        type: 'serial_diff',
        field: '1',
        gap_policy: 'zero_fill',
      };
      const metrics = [{ id: '1', type: 'max', field: 'cpu.pct' }, metric];
      const fn = bucketTransform.serial_diff;
      expect(fn(metric, metrics)).is.eql({
        serial_diff: {
          buckets_path: '1',
          gap_policy: 'zero_fill',
          lag: 1,
        },
      });
    });

    it('throws error if type is missing', () => {
      const run = () => bucketTransform.serial_diff({ id: 'test', field: 'cpu.pct' });
      expect(run).to.throw(Error, 'Metric missing type');
    });

    it('throws error if field is missing', () => {
      const run = () => bucketTransform.serial_diff({ id: 'test', type: 'serial_diff' });
      expect(run).to.throw(Error, 'Metric missing field');
    });
  });

  describe('cumulative_sum', () => {
    it('returns cumulative_sum agg', () => {
      const metric = { id: '2', type: 'cumulative_sum', field: '1' };
      const metrics = [{ id: '1', type: 'sum', field: 'cpu.pct' }, metric];
      const fn = bucketTransform.cumulative_sum;
      expect(fn(metric, metrics, '10s')).is.eql({
        cumulative_sum: { buckets_path: '1' },
      });
    });

    it('throws error if type is missing', () => {
      const run = () => bucketTransform.cumulative_sum({ id: 'test', field: 'cpu.pct' });
      expect(run).to.throw(Error, 'Metric missing type');
    });

    it('throws error if field is missing', () => {
      const run = () => bucketTransform.cumulative_sum({ id: 'test', type: 'cumulative_sum' });
      expect(run).to.throw(Error, 'Metric missing field');
    });
  });

  describe('moving_average', () => {
    it('returns moving_average agg with defaults', () => {
      const metric = { id: '2', type: 'moving_average', field: '1' };
      const metrics = [{ id: '1', type: 'avg', field: 'cpu.pct' }, metric];
      const fn = bucketTransform.moving_average;
      expect(fn(metric, metrics, '10s')).is.eql({
        moving_avg: {
          buckets_path: '1',
          model: 'simple',
          gap_policy: 'skip',
        },
      });
    });

    it('returns moving_average agg with predict', () => {
      const metric = {
        id: '2',
        type: 'moving_average',
        field: '1',
        predict: 10,
      };
      const metrics = [{ id: '1', type: 'avg', field: 'cpu.pct' }, metric];
      const fn = bucketTransform.moving_average;
      expect(fn(metric, metrics, '10s')).is.eql({
        moving_avg: {
          buckets_path: '1',
          model: 'simple',
          gap_policy: 'skip',
          predict: 10,
        },
      });
    });

    it('returns moving_average agg with options', () => {
      const metric = {
        id: '2',
        type: 'moving_average',
        field: '1',
        model: 'holt_winters',
        window: 10,
        minimize: 1,
        settings: 'alpha=0.9 beta=0.5',
      };
      const metrics = [{ id: '1', type: 'avg', field: 'cpu.pct' }, metric];
      const fn = bucketTransform.moving_average;
      expect(fn(metric, metrics, '10s')).is.eql({
        moving_avg: {
          buckets_path: '1',
          model: 'holt_winters',
          gap_policy: 'skip',
          window: 10,
          minimize: true,
          settings: {
            alpha: 0.9,
            beta: 0.5,
          },
        },
      });
    });

    it('throws error if type is missing', () => {
      const run = () => bucketTransform.moving_average({ id: 'test', field: 'cpu.pct' });
      expect(run).to.throw(Error, 'Metric missing type');
    });

    it('throws error if field is missing', () => {
      const run = () => bucketTransform.moving_average({ id: 'test', type: 'moving_average' });
      expect(run).to.throw(Error, 'Metric missing field');
    });
  });

  describe('calculation', () => {
    it('returns calculation(bucket_script)', () => {
      const metric = {
        id: '2',
        type: 'calculation',
        script: 'params.idle != null ? 1 - params.idle : 0',
        variables: [{ name: 'idle', field: '1' }],
      };
      const metrics = [{ id: '1', type: 'avg', field: 'cpu.idle.pct' }, metric];
      const fn = bucketTransform.calculation;
      expect(fn(metric, metrics, '10s')).is.eql({
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

    it('throws error if variables is missing', () => {
      const run = () =>
        bucketTransform.calculation({
          id: 'test',
          type: 'calculation',
          script: 'params.idle != null ? 1 - params.idle : null',
        });
      expect(run).to.throw(Error, 'Metric missing variables');
    });

    it('throws error if script is missing', () => {
      const run = () =>
        bucketTransform.calculation({
          id: 'test',
          type: 'calculation',
          variables: [{ field: '1', name: 'idle' }],
        });
      expect(run).to.throw(Error, 'Metric missing script');
    });
  });

  describe('positive_only', () => {
    it('returns bucket_script', () => {
      const metric = {
        id: '2',
        type: 'positive_only',
        field: '1',
      };
      const metrics = [{ id: '1', type: 'avg', field: 'cpu.idle.pct' }, metric];
      const fn = bucketTransform.positive_only;
      expect(fn(metric, metrics, '10s')).is.eql({
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
