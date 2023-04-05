/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { convertMetricToColumns } from '../metrics';
import { AggBasedColumn, ExtendedColumnConverterArgs, SiblingPipelineMetric } from './types';
import { convertToSchemaConfig } from '../../../vis_schemas';

export const convertToSiblingPipelineColumns = (
  columnConverterArgs: ExtendedColumnConverterArgs<SiblingPipelineMetric>
): AggBasedColumn | null => {
  const { aggParams, label, aggId } = columnConverterArgs.agg;
  if (!aggParams) {
    return null;
  }

  if (!aggParams.customMetric) {
    return null;
  }

  const customMetricColumn = convertMetricToColumns({
    agg: { ...convertToSchemaConfig(aggParams.customMetric), label, aggId },
    dataView: columnConverterArgs.dataView,
    aggs: columnConverterArgs.aggs,
    visType: columnConverterArgs.visType,
  });

  if (!customMetricColumn) {
    return null;
  }

  return customMetricColumn[0];
};
