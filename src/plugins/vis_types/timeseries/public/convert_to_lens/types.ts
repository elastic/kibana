/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { NavigateToLensContext } from '@kbn/visualizations-plugin/public';
import type { Metric, Panel, Series } from '../../common/types';
import { Column } from './lib/convert';

export type ConvertTsvbToLensVisualization = (
  model: Panel
) => Promise<NavigateToLensContext | null>;

export interface Filter {
  kql?: string | { [key: string]: any } | undefined;
  lucene?: string | { [key: string]: any } | undefined;
}

export type ConvertToColumnsFn<C extends Column> = (
  series: Series,
  metric: Metric,
  dataView: DataView
) => Array<C | null> | null;
