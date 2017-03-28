/* eslint max-len:0 */
const filter = metric => metric.type === 'filter_ratio';
import bucketTransform from '../../helpers/bucket_transform';
import _ from 'lodash';
export default function ratios(req, panel, series) {
  return () => doc => {
    if (series.metrics.some(filter)) {
      series.metrics.filter(filter).forEach(metric => {
        _.set(doc, `aggs.${series.id}.aggs.timeseries.aggs.${metric.id}-numerator.filter`, {
          query_string: { query: metric.numerator || '*', analyze_wildcard: true }
        });
        _.set(doc, `aggs.${series.id}.aggs.timeseries.aggs.${metric.id}-denominator.filter`, {
          query_string: { query: metric.denominator || '*', analyze_wildcard: true }
        });

        let numeratorPath = `${metric.id}-numerator>_count`;
        let denominatorPath =  `${metric.id}-denominator>_count`;

        if (metric.metric_agg !== 'count' && bucketTransform[metric.metric_agg]) {
          const aggBody = {
            metric: bucketTransform[metric.metric_agg]({
              type: metric.metric_agg,
              field: metric.field
            })
          };
          _.set(doc, `aggs.${series.id}.aggs.timeseries.aggs.${metric.id}-numerator.aggs`, aggBody);
          _.set(doc, `aggs.${series.id}.aggs.timeseries.aggs.${metric.id}-denominator.aggs`, aggBody);
          numeratorPath = `${metric.id}-numerator>metric`;
          denominatorPath =  `${metric.id}-denominator>metric`;
        }

        _.set(doc, `aggs.${series.id}.aggs.timeseries.aggs.${metric.id}`, {
          bucket_script: {
            buckets_path: {
              numerator: numeratorPath,
              denominator: denominatorPath
            },
            script: 'params.numerator != null && params.denominator != null && params.denominator > 0 ? params.numerator / params.denominator : 0'
          }
        });
      });
    }
    return doc;
  };
}
