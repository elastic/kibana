/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { overwrite } from '../../helpers';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { getTimerange } from '../../helpers/get_timerange';
import { search } from '../../../../../../../plugins/data/server';
const { dateHistogramInterval } = search.aggs;

export function dateHistogram(
  req,
  panel,
  annotation,
  esQueryConfig,
  indexPatternObject,
  capabilities,
  { barTargetUiSettings }
) {
  return (next) => (doc) => {
    const timeField = annotation.time_field;
    const { bucketSize, intervalString } = getBucketSize(
      req,
      'auto',
      capabilities,
      barTargetUiSettings
    );
    const { from, to } = getTimerange(req);
    const timezone = capabilities.searchTimezone;

    overwrite(doc, `aggs.${annotation.id}.date_histogram`, {
      field: timeField,
      min_doc_count: 0,
      time_zone: timezone,
      extended_bounds: {
        min: from.valueOf(),
        max: to.valueOf() - bucketSize * 1000,
      },
      ...dateHistogramInterval(intervalString),
    });
    return next(doc);
  };
}
