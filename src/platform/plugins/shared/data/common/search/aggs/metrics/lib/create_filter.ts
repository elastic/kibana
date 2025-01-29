/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  BooleanRelation,
  buildCombinedFilter,
  buildExistsFilter,
  buildPhraseFilter,
} from '@kbn/es-query';
import { AggConfig } from '../../agg_config';
import { IMetricAggConfig } from '../metric_agg_type';

export const createMetricFilter = <TMetricAggConfig extends AggConfig = IMetricAggConfig>(
  aggConfig: TMetricAggConfig,
  key: string
) => {
  const indexPattern = aggConfig.getIndexPattern();
  if (aggConfig.getField()) {
    return buildExistsFilter(aggConfig.getField(), indexPattern);
  }
};

export const createTopHitFilter = <TMetricAggConfig extends AggConfig = IMetricAggConfig>(
  aggConfig: TMetricAggConfig,
  key: string
) => {
  const indexPattern = aggConfig.getIndexPattern();
  const field = aggConfig.getField();
  if (!field) {
    return;
  }
  return Array.isArray(key)
    ? buildCombinedFilter(
        BooleanRelation.OR,
        key.map((k) => buildPhraseFilter(field, k, indexPattern)),
        indexPattern
      )
    : buildPhraseFilter(field, key, indexPattern);
};
