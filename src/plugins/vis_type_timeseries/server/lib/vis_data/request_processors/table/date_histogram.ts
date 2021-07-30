/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  overwrite,
  getBucketSize,
  isLastValueTimerangeMode,
  getTimerange,
  isAggSupported,
} from '../../helpers';
import { calculateAggRoot } from './calculate_agg_root';
import { search, UI_SETTINGS } from '../../../../../../../plugins/data/server';
import { METRIC_AGGREGATIONS } from '../../../../../common/enums';

import type { TableRequestProcessorsFunction, TableSearchRequestMeta } from './types';

const { dateHistogramInterval } = search.aggs;

export const dateHistogram: TableRequestProcessorsFunction = ({
  req,
  panel,
  seriesIndex,
  capabilities,
  uiSettings,
  buildSeriesMetaParams,
}) => (next) => async (doc) => {
  const barTargetUiSettings = await uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET);
  const { timeField, interval } = await buildSeriesMetaParams();
  const { from, to } = getTimerange(req);

  const meta: TableSearchRequestMeta = {
    timeField,
    index: panel.use_kibana_indexes ? seriesIndex.indexPattern?.id : undefined,
    panelId: panel.id,
  };

  const { intervalString } = getBucketSize(req, interval, capabilities, barTargetUiSettings);
  const { timezone } = capabilities;

  const overwriteDateHistogramForLastBucketMode = () => {
    panel.series.forEach((column) => {
      const aggRoot = calculateAggRoot(doc, column);

      overwrite(doc, `${aggRoot}.timeseries.date_histogram`, {
        field: timeField,
        min_doc_count: 0,
        time_zone: timezone,
        extended_bounds: {
          min: from.valueOf(),
          max: to.valueOf(),
        },
        ...dateHistogramInterval(intervalString),
      });

      overwrite(doc, aggRoot.replace(/\.aggs$/, '.meta'), {
        ...meta,
        intervalString,
      });
    });
  };

  const overwriteDateHistogramForEntireTimerangeMode = () => {
    const metricAggs = Object.values<string>(METRIC_AGGREGATIONS);
    let interval;

    panel.series.forEach((column) => {
      isAggSupported(column.metrics);

      const aggRoot = calculateAggRoot(doc, column);

      if (column.metrics.every((metric) => metricAggs.includes(metric.type))) {
        overwrite(doc, `${aggRoot}.timeseries.auto_date_histogram`, {
          field: timeField,
          buckets: 1,
        });

        interval = `${to.valueOf() - from.valueOf()}ms`;
      } else {
        overwrite(doc, `${aggRoot}.timeseries.date_histogram`, {
          field: timeField,
          min_doc_count: 0,
          time_zone: timezone,
          extended_bounds: {
            min: from.valueOf(),
            max: to.valueOf(),
          },
          ...dateHistogramInterval(intervalString),
        });
        interval = intervalString;
      }

      overwrite(doc, aggRoot.replace(/\.aggs$/, '.meta'), {
        ...meta,
        interval,
      });
    });
  };

  if (isLastValueTimerangeMode(panel)) {
    overwriteDateHistogramForLastBucketMode();
  } else {
    overwriteDateHistogramForEntireTimerangeMode();
  }

  return next(doc);
};
