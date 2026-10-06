/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggConfig } from '../../agg_config';
import type { IMetricAggConfig } from '../metric_agg_type';
export declare const createMetricFilter: <TMetricAggConfig extends AggConfig = IMetricAggConfig>(
  aggConfig: TMetricAggConfig,
  key: string
) => import('@kbn/es-query').ExistsFilter | undefined;
export declare const createTopHitFilter: <TMetricAggConfig extends AggConfig = IMetricAggConfig>(
  aggConfig: TMetricAggConfig,
  key: string
) =>
  | import('@kbn/es-query').CombinedFilter
  | import('@kbn/es-query').PhraseFilter
  | import('@kbn/es-query').ScriptedPhraseFilter
  | undefined;
