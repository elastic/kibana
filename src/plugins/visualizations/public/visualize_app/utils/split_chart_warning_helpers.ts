/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { $Values } from '@kbn/utility-types';
import { AggConfigs } from '@kbn/data-plugin/common';
import { NEW_HEATMAP_CHARTS_LIBRARY, NEW_GAUGE_CHARTS_LIBRARY } from '../constants';

export const CHARTS_WITHOUT_SMALL_MULTIPLES = {
  heatmap: 'heatmap',
  gauge: 'gauge',
} as const;

export type CHARTS_WITHOUT_SMALL_MULTIPLES = $Values<typeof CHARTS_WITHOUT_SMALL_MULTIPLES>;

export const CHARTS_CONFIG_TOKENS = {
  [CHARTS_WITHOUT_SMALL_MULTIPLES.heatmap]: NEW_HEATMAP_CHARTS_LIBRARY,
  [CHARTS_WITHOUT_SMALL_MULTIPLES.gauge]: NEW_GAUGE_CHARTS_LIBRARY,
} as const;

export const isSplitChart = (chartType: string | undefined, aggs?: AggConfigs) => {
  const defaultIsSplitChart = () => aggs?.aggs.some((agg) => agg.schema === 'split');

  const knownCheckers = {
    [CHARTS_WITHOUT_SMALL_MULTIPLES.heatmap]: defaultIsSplitChart,
    [CHARTS_WITHOUT_SMALL_MULTIPLES.gauge]: () => aggs?.aggs.some((agg) => agg.schema === 'group'),
  };

  return (knownCheckers[chartType as CHARTS_WITHOUT_SMALL_MULTIPLES] ?? defaultIsSplitChart)();
};
