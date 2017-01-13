import _ from 'lodash';
import Color from 'color';
import getAggValue from '../get_agg_value';
import getSiblingAggValue from '../get_sibling_agg_value';
import calculateLabel from '../../../public/components/vis_editor/lib/calculate_label';
import SeriesAgg from '../series_agg';
import getDefaultDecoration from './get_default_decoration';
import unitToSeconds from '../unit_to_seconds';
export default panel => resp => {
  const aggs = _.get(resp, 'aggregations');
  let result = [];

  panel.series.forEach((series, index) => {
    const metric = _.last(series.metrics.filter(s => s.type !== 'series_agg'));
    const mapBucket = metric => bucket => [ bucket.key, getAggValue(bucket, metric)];
    const decoration = getDefaultDecoration(series);

    // Handle buckets with a terms agg
    if (_.has(aggs, `${series.id}.buckets`)) {
      const terms = _.get(aggs, `${series.id}.buckets`);
      const color = new Color(series.color);
      terms.forEach(term => {
        if (metric.type === 'std_deviation' && metric.mode === 'band') {
          const upper = term.timeseries.buckets.map(mapBucket(_.assign({}, metric, { mode: 'upper' })));
          const lower = term.timeseries.buckets.map(mapBucket(_.assign({}, metric, { mode: 'lower' })));
          result.push({
            id: `${series.id}:${term.key}:upper`,
            label: term.key,
            color: color.hexString(),
            lines: { show: true, fill: 0.5, lineWidth: 0 },
            points: { show: false },
            fillBetween: `${series.id}:${term.key}:lower`,
            data: upper
          });
          result.push({
            id: `${series.id}:${term.key}:lower`,
            color: color.hexString(),
            lines: { show: true, fill: false, lineWidth: 0 },
            points: { show: false },
            data: lower
          });
        } else if (metric.type === 'percentile') {
          metric.percentiles.forEach(percentile => {
            const deco = {};
            const label = (term.key) + ` (${percentile.value})`;
            const data = term.timeseries.buckets.map(bucket => {
              const m = _.assign({}, metric, { percent: percentile.value });
              return [bucket.key, getAggValue(bucket, m)];
            });
            if (percentile.mode === 'band') {
              const fillData = term.timeseries.buckets.map(bucket => {
                const m = _.assign({}, metric, { percent: percentile.percentile });
                return [bucket.key, getAggValue(bucket, m)];
              });
              result.push({
                id: `${percentile.id}:${term.key}`,
                color: color.hexString(),
                label,
                data,
                lines: { show: true, fill: percentile.shade, lineWidth: 0 },
                points: { show: false },
                legend: false,
                fillBetween: `${percentile.id}:${term.key}:${percentile.percentile}`
              });
              result.push({
                id: `${percentile.id}:${term.key}:${percentile.percentile}`,
                color: color.hexString(),
                label,
                data: fillData,
                lines: { show: true, fill: false, lineWidth: 0 },
                legend: false,
                points: { show: false }
              });
            } else {
              result.push({
                id: `${percentile.id}:${term.key}`,
                color: color.hexString(),
                label,
                data,
                ...decoration
              });
            }
          });
        } else {
          const data = term.timeseries.buckets.map(mapBucket(metric));
          result.push({
            id: `${series.id}:${term.key}`,
            label: term.key,
            color: color.hexString(),
            data,
            ...decoration
          });
        }
        color.darken(0.1);
      });


      //handle without group buckets
    } else {
      const buckets = _.get(aggs, `${series.id}.timeseries.buckets`);
      if (/_bucket$/.test(metric.type)) {
        if (metric.type === 'std_deviation_bucket' && metric.mode === 'band') {
          function mapBucketByMode(mode) {
            return bucket => {
              const sibBucket = _.get(aggs, `${series.id}`);
              return [bucket.key, getSiblingAggValue(sibBucket, _.assign({}, metric, { mode }))];
            };
          }
          const upperData = buckets.map(mapBucketByMode('upper'));
          const lowerData = buckets.map(mapBucketByMode('lower'));
          result.push({
            id: `${series.id}:lower`,
            lines: { show: true, fill: false, lineWidth: 0 },
            points: { show: false },
            color: series.color,
            data: lowerData
          });
          result.push({
            id: `${series.id}:upper`,
            label: series.label || calculateLabel(metric, series.metrics),
            color: series.color,
            lines: { show: true, fill: 0.5, lineWidth: 0 },
            points: { show: false },
            fillBetween: `${series.id}:lower`,
            data: upperData
          });
        } else if(buckets) {
          const data = buckets.map(bucket => {
            const sibBucket = _.get(aggs, `${series.id}`);
            return [bucket.key, getSiblingAggValue(sibBucket, metric)];
          });
          result.push({
            id: series.id,
            label: series.label || calculateLabel(metric, series.metrics),
            color: series.color,
            data,
            ...decoration
          });
        }
      } else if (metric.type === 'std_deviation' && metric.mode === 'band') {
        const upper = buckets.map(mapBucket(_.assign({}, metric, { mode: 'upper' })));
        const lower = buckets.map(mapBucket(_.assign({}, metric, { mode: 'lower' })));
        result.push({
          id: `${series.id}:upper`,
          label: series.label || calculateLabel(metric, series.metrics),
          color: series.color,
          lines: { show: true, fill: 0.5, lineWidth: 0 },
          points: { show: false },
          fillBetween: `${series.id}:lower`,
          data: upper
        });
        result.push({
          id: `${series.id}:lower`,
          color: series.color,
          lines: { show: true, fill: false, lineWidth: 0 },
          points: { show: false },
          data: lower
        });
      } else if (metric.type === 'percentile') {
        metric.percentiles.forEach(percentile => {
          const deco = {};
          const label = (series.label || calculateLabel(metric, series.metrics)) + ` (${percentile.value})`;
          const data = buckets.map(bucket => {
            const m = _.assign({}, metric, { percent: percentile.value });
            return [bucket.key, getAggValue(bucket, m)];
          });
          if (percentile.mode === 'band') {
            const fillData = buckets.map(bucket => {
              const m = _.assign({}, metric, { percent: percentile.percentile });
              return [bucket.key, getAggValue(bucket, m)];
            });
            result.push({
              id: percentile.id,
              color: series.color,
              data,
              label,
              legend: false,
              lines: { show: true, fill: percentile.shade, lineWidth: 0 },
              points: { show: false },
              fillBetween: `${percentile.id}:${percentile.percentile}`
            });
            result.push({
              id: `${percentile.id}:${percentile.percentile}`,
              color: series.color,
              label,
              legend: false,
              data: fillData,
              lines: { show: true, fill: false, lineWidth: 0 },
              points: { show: false }
            });
          } else {
            result.push({
              id: percentile.id,
              color: series.color,
              label,
              data,
              ...decoration
            });
          }
        });
      } else if(buckets) {
        const data = buckets.map(mapBucket(metric));
        result.push({
          id: series.id,
          label: series.label || calculateLabel(metric, series.metrics),
          color: series.color,
          data,
          ...decoration
        });
      }
    } // end

    if (series.metrics.some(m => m.type === 'series_agg') && metric.type !== 'std_deviation' && metric.mode !== 'band') {
      const targetSeries = [];
      // Filter out the seires with the matching metric and store them
      // in targetSeries
      result = result.filter(s => {
        if (s.id.split(/:/)[0] === series.id) {
          targetSeries.push(s.data);
          return false;
        }
        return true;
      });
      const data = series.metrics.filter(m => m.type === 'series_agg')
        .reduce((acc, m) => {
          const fn = SeriesAgg[m.function];
          return fn && fn(acc) || acc;
        }, targetSeries);
      result.push({
        id: `${series.id}`,
        label: series.label || calculateLabel(_.last(series.metrics), series.metrics),
        color: series.color,
        data: _.first(data),
        ...decoration
      });

    }

    if (/^([\d]+)([shmdwMy]|ms)$/.test(series.offset_time)) {
      const matches = series.offset_time.match(/^([\d]+)([shmdwMy]|ms)$/);
      if (matches) {
        const offsetSeconds = Number(matches[1]) * unitToSeconds(matches[2]);
        result.forEach(item => {
          if (_.startsWith(item.id, series.id)) {
            item.data = item.data.map(row => [row[0] + (offsetSeconds * 1000), row[1]]);
          }
        });
      }
    }
  });

  return result;

};
