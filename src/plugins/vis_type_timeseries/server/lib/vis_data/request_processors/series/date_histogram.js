/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { overwrite } from '../../helpers';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { offsetTime } from '../../offset_time';
import { getIntervalAndTimefield } from '../../get_interval_and_timefield';
import { isLastValueTimerangeMode } from '../../helpers/get_timerange_mode';
import { search, UI_SETTINGS } from '../../../../../../../plugins/data/server';
const { dateHistogramInterval } = search.aggs;

export function dateHistogram(
  req,
  panel,
  series,
  esQueryConfig,
  indexPatternObject,
  capabilities,
  uiSettings
) {
  return (next) => async (doc) => {
    const maxBarsUiSettings = await uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS);
    const barTargetUiSettings = await uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET);

    const { timeField, interval, maxBars } = getIntervalAndTimefield(
      panel,
      series,
      indexPatternObject
    );
    const { bucketSize, intervalString } = getBucketSize(
      req,
      interval,
      capabilities,
      maxBars ? Math.min(maxBarsUiSettings, maxBars) : barTargetUiSettings
    );

    const getDateHistogramForLastBucketMode = () => {
      const { from, to } = offsetTime(req, series.offset_time);
      const timezone = capabilities.searchTimezone;

      overwrite(doc, `aggs.${series.id}.aggs.timeseries.date_histogram`, {
        field: timeField,
        min_doc_count: 0,
        time_zone: timezone,
        extended_bounds: {
          min: from.valueOf(),
          max: to.valueOf(),
        },
        ...dateHistogramInterval(intervalString),
      });
    };

    const getDateHistogramForEntireTimerangeMode = () =>
      overwrite(doc, `aggs.${series.id}.aggs.timeseries.auto_date_histogram`, {
        field: timeField,
        buckets: 1,
      });

    isLastValueTimerangeMode(panel, series)
      ? getDateHistogramForLastBucketMode()
      : getDateHistogramForEntireTimerangeMode();

    overwrite(doc, `aggs.${series.id}.meta`, {
      timeField,
      intervalString,
      index: indexPatternObject?.title,
      bucketSize,
      seriesId: series.id,
    });

    return next(doc);
  };
}
