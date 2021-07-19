/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getBucketSize } from '../../helpers/get_bucket_size';
import { calculateAggRoot } from './calculate_agg_root';
import { createPositiveRate, filter } from '../series/positive_rate';
import { UI_SETTINGS } from '../../../../../../data/common';

export function positiveRate(
  req,
  panel,
  esQueryConfig,
  seriesIndex,
  capabilities,
  uiSettings,
  buildSeriesMetaParams
) {
  return (next) => async (doc) => {
    const barTargetUiSettings = await uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET);
    const { interval } = await buildSeriesMetaParams();
    const { intervalString } = getBucketSize(req, interval, capabilities, barTargetUiSettings);

    panel.series.forEach((column) => {
      const aggRoot = calculateAggRoot(doc, column);
      column.metrics.filter(filter).forEach(createPositiveRate(doc, intervalString, aggRoot));
    });
    return next(doc);
  };
}
