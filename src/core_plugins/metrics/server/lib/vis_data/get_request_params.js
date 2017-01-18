import _ from 'lodash';
import moment from 'moment';
import getBucketSize from './get_bucket_size';
import getBucketsPath from '../get_buckets_path';
import basicAggs from '../../../public/lib/basic_aggs';
import bucketTransform from '../bucket_transform';
import unitToSeconds from '../unit_to_seconds';
import calculateIndices from '../calculate_indices';

export default (req, panel, series) => {
  const indexPattern = series.override_index_pattern && series.series_index_pattern || panel.index_pattern;
  const timeField = series.override_index_pattern && series.series_time_field || panel.time_field;
  const interval = series.override_index_pattern && series.series_interval || panel.interval;

  return calculateIndices(req, indexPattern, timeField).then(indices => {
    const bodies = [];
    const { bucketSize, intervalString } = getBucketSize(req, interval);
    const globalFilters = req.payload.filters;
    const from = moment.utc(req.payload.timerange.min);
    const to = moment.utc(req.payload.timerange.max);

    if (/^([\d]+)([shmdwMy]|ms)$/.test(series.offset_time)) {
      const matches = series.offset_time.match(/^([\d]+)([shmdwMy]|ms)$/);
      if (matches) {
        const offsetSeconds = Number(matches[1]) * unitToSeconds(matches[2]);
        from.subtract(offsetSeconds, 's');
        to.subtract(offsetSeconds, 's');
      }
    }

    const params = {
      index: indices,
      body: {
        size: 0,
        query: {
          bool: {
            must: [],
            should: [],
            must_not: []
          }
        },
        aggs: {}
      }
    };

    const timerange = { range: {} };
    timerange.range[timeField] = {
      gte: from.valueOf(),
      lte: to.valueOf() - (bucketSize * 1000),
      format: 'epoch_millis',
    };
    params.body.query.bool.must.push(timerange);

    if (globalFilters && !panel.ignore_global_filter) {
      params.body.query.bool.must = params.body.query.bool.must.concat(globalFilters);
    }

    if (panel.filter) {
      params.body.query.bool.must.push({
        query_string: {
          query: panel.filter,
          analyze_wildcard: true
        }
      });
    }

    const aggs = params.body.aggs;
    aggs[series.id] = {};
    const seriesAgg = aggs[series.id];


    // Setup the top level aggregation based on the type of group by specified
    // in the series.
    if (series.split_mode === 'filter' && series.filter) {
      seriesAgg.filter = {
        query_string: {
          query: series.filter,
          analyze_wildcard: true
        }
      };
      // if it's a terms group by then we need to add the terms agg along
      // with a metric agg for sorting
    } else if (series.split_mode === 'terms' && series.terms_field) {
      seriesAgg.terms = {
        field: series.terms_field,
        size: parseInt(series.terms_size, 10) || 10,
      };
      const metric = series.metrics.find(item => item.id === series.terms_order_by);
      if (metric && metric.type !== 'count' && ~basicAggs.indexOf(metric.type)) {
        const sortAggKey = `${series.terms_order_by}-SORT`;
        const fn = bucketTransform[metric.type];
        const bucketPath = getBucketsPath(series.terms_order_by, series.metrics)
          .replace(series.terms_order_by, `${sortAggKey} > SORT`);
        seriesAgg.terms.order = {};
        seriesAgg.terms.order[bucketPath] = 'desc';
        seriesAgg.aggs = {};
        seriesAgg.aggs[sortAggKey] = {
          filter: { range: {} },
          aggs: { SORT: fn(metric) }
        };
        seriesAgg.aggs[sortAggKey].filter.range[timeField] = {
          gte: to.valueOf() - (bucketSize * 1500),
          lte: to.valueOf(),
          format: 'epoch_millis',
        };
      }
      // For group by everything we add a match all filter so the data
      // structure in the response has the same structure.
    } else {
      seriesAgg.filter = { match_all: {} };
    }

    // Add the timeseries agg to the seriesAgg.aggs object. Sometimes there
    // might be aggs already there, like a terms agg might have a set of aggs
    // for sorting.
    seriesAgg.aggs = _.assign({}, seriesAgg.aggs || {}, {
      timeseries: {
        date_histogram: {
          field: timeField,
          interval: intervalString,
          min_doc_count: 0,
          extended_bounds: {
            min: from.valueOf(),
            max: to.valueOf() - (bucketSize * 1000)
          }
        },
        aggs: {}
      }
    });

    // Transform series.metrics into aggregations for NON-SIBLING buckets
    const metricAggs = seriesAgg.aggs.timeseries.aggs;
    series.metrics
      .filter(row => !/_bucket$/.test(row.type) && !/^series/.test(row.type))
      .forEach(metric => {
        const fn = bucketTransform[metric.type];
        if (fn) {
          try {
            metricAggs[metric.id] = fn(metric, series.metrics, intervalString);
          } catch (e) {
            // meh
          }
        }
      });

    // Transform series.metrics into aggregations for SIBLING buckets, sibling
    // buckets need to be attached at the same level as the series.
    const siblingAggs = seriesAgg.aggs;
    series.metrics
      .filter(row => /_bucket$/.test(row.type))
      .forEach(metric => {
        const fn = bucketTransform[metric.type];
        if (fn) {
          try {
            siblingAggs[metric.id] = fn(metric, series.metrics, bucketSize);
          } catch (e) {
            // meh
          }
        }
      });

    bodies.push({
      index: params.index,
      ignore: [404],
      timeout: '90s',
      requestTimeout: 90000,
      ignoreUnavailable: true,
    });
    bodies.push(params.body);
    return { body: bodies };
  });
};
