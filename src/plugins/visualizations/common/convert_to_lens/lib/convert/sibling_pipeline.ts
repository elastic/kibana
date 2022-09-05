/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggParamsMapping, BUCKET_TYPES } from '@kbn/data-plugin/common';
import { FormulaColumn } from '../../types';
import { getBucketColumns } from '../buckets';
import { getFormulaForPipelineAgg } from '../metrics/formula';
import { createFormulaColumn } from './formula';
import { BucketColumn, CommonColumnConverterArgs, SiblingPipelineMetric } from './types';

export const convertToSiblingPipelineColumns = (
  columnConverterArgs: CommonColumnConverterArgs<SiblingPipelineMetric>,
  reducedTimeRange?: string
): Array<BucketColumn | FormulaColumn> | null => {
  const { aggParams } = columnConverterArgs.agg;
  if (!aggParams) {
    return null;
  }
  const columns = [];

  if (aggParams.customBucket) {
    const aggBucketParams = aggParams.customBucket.serialize()
      .params as AggParamsMapping[BUCKET_TYPES];
    const label = aggParams.customBucket.makeLabel();
    const bucketColumns = getBucketColumns(
      aggParams.customBucket.type.dslName as BUCKET_TYPES,
      aggBucketParams,
      label,
      columnConverterArgs.dataView
    );
    if (!bucketColumns) {
      return null;
    }
    columns.push(bucketColumns);
  }

  if (!aggParams.customMetric) {
    return null;
  }

  const formula = getFormulaForPipelineAgg(aggParams.customMetric, reducedTimeRange);
  if (!formula) {
    return null;
  }

  const formulaColumn = createFormulaColumn(formula, columnConverterArgs.agg);
  if (!formulaColumn) {
    return null;
  }

  columns.push(formulaColumn);

  return columns;
};
