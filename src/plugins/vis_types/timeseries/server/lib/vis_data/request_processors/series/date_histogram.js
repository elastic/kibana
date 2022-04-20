/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { overwrite } from '../../helpers';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { offsetTime } from '../../offset_time';
import { isLastValueTimerangeMode } from '../../helpers/get_timerange_mode';
import { search, UI_SETTINGS } from '@kbn/data-plugin/server';

const { dateHistogramInterval } = search.aggs;

export function dateHistogram(
  req,
  panel,
  series,
  esQueryConfig,
  seriesIndex,
  capabilities,
  uiSettings,
  buildSeriesMetaParams
) {
  return (next) => async (doc) => {
    const maxBarsUiSettings = await uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS);
    const barTargetUiSettings = await uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET);

    const { timeField, interval, maxBars } = await buildSeriesMetaParams();
    const { from, to } = offsetTime(req, series.offset_time);

    let bucketInterval;

    const overwriteDateHistogramForLastBucketMode = () => {
      const { timezone } = capabilities;

      const { intervalString } = getBucketSize(
        req,
        interval,
        capabilities,
        maxBars ? Math.min(maxBarsUiSettings, maxBars) : barTargetUiSettings
      );

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

      bucketInterval = intervalString;
    };

    const overwriteDateHistogramForEntireTimerangeMode = () => {
      overwrite(doc, `aggs.${series.id}.aggs.timeseries.auto_date_histogram`, {
        field: timeField,
        buckets: 1,
      });

      bucketInterval = `${to.valueOf() - from.valueOf()}ms`;
    };

    isLastValueTimerangeMode(panel, series)
      ? overwriteDateHistogramForLastBucketMode()
      : overwriteDateHistogramForEntireTimerangeMode();

    overwrite(doc, `aggs.${series.id}.meta`, {
      timeField,
      panelId: panel.id,
      seriesId: series.id,
      intervalString: bucketInterval,
      dataViewId: panel.use_kibana_indexes ? seriesIndex.indexPattern?.id : undefined,
      indexPatternString: seriesIndex.indexPatternString,
    });

    return next(doc);
  };
}
