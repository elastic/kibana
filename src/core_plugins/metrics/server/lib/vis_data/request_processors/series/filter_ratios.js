/* eslint max-len:0 */
const filter = metric => metric.type === 'filter_ratio';
import _ from 'lodash';
export default function ratios(req, panel, series) {
  return next => doc => {
    if (series.metrics.some(filter)) {
      series.metrics.filter(filter).forEach(metric => {
        _.set(doc, `aggs.${series.id}.aggs.timeseries.aggs.${metric.id}-numerator.filter`, {
          query_string: { query: metric.numerator || '*', analyze_wildcard: true }
        });
        _.set(doc, `aggs.${series.id}.aggs.timeseries.aggs.${metric.id}-denominator.filter`, {
          query_string: { query: metric.denominator || '*', analyze_wildcard: true }
        });
        _.set(doc, `aggs.${series.id}.aggs.timeseries.aggs.${metric.id}`, {
          bucket_script: {
            buckets_path: {
              numerator: `${metric.id}-numerator>_count`,
              denominator: `${metric.id}-denominator>_count`
            },
            script: 'params.numerator != null && params.denominator != null && params.denominator > 0 ? params.numerator / params.denominator : 0'
          }
        });
      });
    }
    return doc;
  };
}
