/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { convertMetricToColumns } from '../metrics';
import { CommonColumnConverterArgs, SiblingPipelineMetric } from './types';
import { Column } from '../../types';
import { convertToSchemaConfig } from '../agg';

export const convertToSiblingPipelineColumns = (
  columnConverterArgs: CommonColumnConverterArgs<SiblingPipelineMetric>,
  reducedTimeRange?: string
): Column | null => {
  const { aggParams } = columnConverterArgs.agg;
  if (!aggParams) {
    return null;
  }

  if (!aggParams.customMetric) {
    return null;
  }

  const customMetricColumn = convertMetricToColumns(
    convertToSchemaConfig(aggParams.customMetric),
    columnConverterArgs.dataView
  );

  if (!customMetricColumn) {
    return null;
  }

  return customMetricColumn[0];
};
