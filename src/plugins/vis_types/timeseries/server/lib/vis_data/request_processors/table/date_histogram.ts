/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { overwrite, getBucketSize, isLastValueTimerangeMode, getTimerange } from '../../helpers';
import { calculateAggRoot } from './calculate_agg_root';
import { search, UI_SETTINGS } from '../../../../../../../../plugins/data/server';
import { AGG_TYPE, getAggsByType } from '../../../../../common/agg_utils';
import { TSVB_METRIC_TYPES } from '../../../../../common/enums';

import type { TableRequestProcessorsFunction, TableSearchRequestMeta } from './types';

const { dateHistogramInterval } = search.aggs;

export const dateHistogram: TableRequestProcessorsFunction =
  ({ req, panel, seriesIndex, capabilities, uiSettings, buildSeriesMetaParams }) =>
  (next) =>
  async (doc) => {
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
      const metricAggs = getAggsByType<string>((agg) => agg.id)[AGG_TYPE.METRIC];
      let bucketInterval;

      panel.series.forEach((column) => {
        const aggRoot = calculateAggRoot(doc, column);

        // we should use auto_date_histogram only for metric aggregations and math
        if (
          column.metrics.every(
            (metric) => metricAggs.includes(metric.type) || metric.type === TSVB_METRIC_TYPES.MATH
          )
        ) {
          overwrite(doc, `${aggRoot}.timeseries.auto_date_histogram`, {
            field: timeField,
            buckets: 1,
          });

          bucketInterval = `${to.valueOf() - from.valueOf()}ms`;
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
          bucketInterval = intervalString;
        }

        overwrite(doc, aggRoot.replace(/\.aggs$/, '.meta'), {
          ...meta,
          intervalString: bucketInterval,
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
