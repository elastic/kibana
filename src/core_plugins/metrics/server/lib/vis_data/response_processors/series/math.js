import { flatten, values, first, last } from 'lodash';
import getDefaultDecoration from '../../helpers/get_default_decoration';
import getSiblingAggValue from '../../helpers/get_sibling_agg_value';
import getSplits from '../../helpers/get_splits';
import mapBucket from '../../helpers/map_bucket';
import mathjs from 'mathjs';

const limitedEval = mathjs.eval;
mathjs.import({
  'import':     function () { throw new Error('Function import is disabled'); },
  'createUnit': function () { throw new Error('Function createUnit is disabled'); },
  'eval':       function () { throw new Error('Function eval is disabled'); },
  'parse':      function () { throw new Error('Function parse is disabled'); },
  'simplify':   function () { throw new Error('Function simplify is disabled'); },
  'derivative': function () { throw new Error('Function derivative is disabled'); }
}, { override: true });

export function mathAgg(resp, panel, series) {
  return next => results => {
    const mathMetric = last(series.metrics);
    if (mathMetric.type === 'math') {
      results = results.filter(s => {
        if (s.id.split(/:/)[0] === series.id) {
          return false;
        }
        return true;
      });
      const decoration = getDefaultDecoration(series);
      const splits = getSplits(resp, panel, series);
      const mathSeries = splits.map((split) => {
        if (mathMetric.variables.length) {
          const splitData = mathMetric.variables.reduce((acc, v) => {
            const metric = series.metrics.find(m => m.id === v.field);
            if (!metric) return acc;
            if (/_bucket$/.test(metric.type)) {
              acc[v.name] = split.timeseries.buckets.map(bucket => {
                return [bucket.key, getSiblingAggValue(split, metric)];
              });
            } else {
              acc[v.name] = split.timeseries.buckets.map(mapBucket(metric));
            }
            return acc;
          }, {});
          const all = Object.keys(splitData).reduce((acc, key) => {
            acc[key] = {
              values: splitData[key].map(x => x[1]),
              timestamps: splitData[key].map(x => x[0])
            };
            return acc;
          }, {});
          const firstVar = first(mathMetric.variables);
          if (!splitData[firstVar.name]) {
            return {
              id: split.id,
              label: split.label,
              color: split.color,
              data: [],
              ...decoration
            };
          }
          const timestamps = splitData[firstVar.name].map(r => first(r));
          const data = timestamps.map((ts, index) => {
            const params = mathMetric.variables.reduce((acc, v) => {
              acc[v.name] = last(splitData[v.name].find(row => row[0] === ts));
              return acc;
            }, {});
            const someNull = values(params).some(v => v == null);
            if (someNull) return [ts, null];
            const result = limitedEval(mathMetric.script, { params: { ...params, _index: index, _timestamp: ts, _all: all } });
            if (typeof result === 'object') return [ts, last(flatten(result.valueOf()))];
            return [ts, result];
          });
          return {
            id: split.id,
            label: split.label,
            color: split.color,
            data,
            ...decoration
          };
        }
      });
      return next(results.concat(mathSeries));

    }
    return next(results);
  };
}
