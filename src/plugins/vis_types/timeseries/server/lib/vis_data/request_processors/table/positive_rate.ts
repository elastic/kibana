/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { calculateAggRoot } from './calculate_agg_root';

import type { TableRequestProcessorsFunction } from './types';

// @ts-expect-error not typed yet
import { createPositiveRate, filter } from '../series/positive_rate';

export const positiveRate: TableRequestProcessorsFunction =
  ({ req, panel, capabilities, uiSettings, buildSeriesMetaParams }) =>
  (next) =>
  async (doc) => {
    const barTargetUiSettings = await uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET);
    const { interval } = await buildSeriesMetaParams();
    const { intervalString } = getBucketSize(req, interval, capabilities, barTargetUiSettings);

    panel.series.forEach((column) => {
      const aggRoot = calculateAggRoot(doc, column);
      column.metrics.filter(filter).forEach(createPositiveRate(doc, intervalString, aggRoot));
    });
    return next(doc);
  };
