import _ from 'lodash';
import moment from 'moment';
import getBucketSize from './get_bucket_size';
import getBucketsPath from '../get_buckets_path';
import basicAggs from '../../../public/components/lib/basic_aggs';
import bucketTransform from './bucket_transform';
import unitToSeconds from '../unit_to_seconds';
import calculateIndices from '../calculate_indices';
import buildRequestBody from './build_request_body';
import getIntervalAndTimefield from './get_interval_and_timefield';

export default (req, panel, series) => {
  const indexPattern = series.override_index_pattern && series.series_index_pattern || panel.index_pattern;
  const { timeField, interval } = getIntervalAndTimefield(panel, series);

  return calculateIndices(req, indexPattern, timeField, series.offset_time).then(indices => {
    const bodies = [];

    bodies.push({
      index: indices,
      ignore: [404],
      timeout: '90s',
      requestTimeout: 90000,
      ignoreUnavailable: true,
    });

    bodies.push(buildRequestBody(req, panel, series));
    return bodies;
  });
};
