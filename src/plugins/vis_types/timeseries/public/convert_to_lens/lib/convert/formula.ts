/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as uuid } from 'uuid';
import { METRIC_TYPES } from '@kbn/data-plugin/public';
import {
  FormulaParams,
  FormulaColumn as BaseFormulaColumn,
} from '@kbn/visualizations-plugin/common/convert_to_lens';
import { CommonColumnConverterArgs, CommonColumnsConverterArgs, FormulaColumn } from './types';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';
import type { Metric } from '../../../../common/types';
import { getFormulaEquivalent, getPipelineSeriesFormula } from '../metrics';
import { createColumn, getFormat } from './column';
import { AdditionalArgs } from '../../types';

type OtherFormulaAggregations =
  | typeof TSVB_METRIC_TYPES.POSITIVE_ONLY
  | typeof METRIC_TYPES.AVG_BUCKET
  | typeof METRIC_TYPES.MAX_BUCKET
  | typeof METRIC_TYPES.MIN_BUCKET
  | typeof METRIC_TYPES.SUM_BUCKET;

const convertToFormulaParams = (formula: string): FormulaParams => ({
  formula,
});

export const createFormulaColumn = (
  formula: string,
  { series, metric }: CommonColumnConverterArgs
): FormulaColumn | null => {
  const params = convertToFormulaParams(formula);
  return {
    operationType: 'formula',
    references: [],
    ...createColumn(series, metric, undefined, { isAssignTimeScale: false }),
    params: { ...params, ...getFormat(series) },
  };
};

export const createFormulaColumnWithoutMeta = (formula: string): BaseFormulaColumn => {
  const params = convertToFormulaParams(formula);
  return {
    columnId: uuid(),
    operationType: 'formula',
    references: [],
    dataType: 'string',
    isSplit: false,
    isBucketed: false,
    params: { ...params },
  };
};

const convertFormulaScriptForPercentileAggs = (
  mathScript: string,
  variables: Exclude<Metric['variables'], undefined>,
  metric: Metric,
  allAggMetrics: Metric[],
  additionalArgs: AdditionalArgs
) => {
  variables.forEach((variable) => {
    const [_, meta] = variable?.field?.split('[') ?? [];
    const metaValue = Number(meta?.replace(']', ''));
    if (!metaValue) {
      return;
    }
    const script = getFormulaEquivalent(metric, allAggMetrics, { metaValue, ...additionalArgs });
    if (!script) {
      return;
    }
    mathScript = mathScript?.replace(`params.${variable.name}`, script);
  });
  return mathScript;
};

const convertFormulaScriptForAggs = (
  mathScript: string,
  variables: Exclude<Metric['variables'], undefined>,
  metric: Metric,
  allAggMetrics: Metric[],
  additionalArgs: AdditionalArgs
) => {
  const script = getFormulaEquivalent(metric, allAggMetrics, { ...additionalArgs });
  if (!script) {
    return null;
  }
  const variable = variables.find((v) => v.field === metric.id);
  return mathScript?.replaceAll(`params.${variable?.name}`, script);
};

export const convertMathToFormulaColumn = (
  { series, metrics, dataView }: CommonColumnsConverterArgs,
  reducedTimeRange?: string
): FormulaColumn | null => {
  // find the metric idx that has math expression
  const metric = metrics.find(({ type }) => type === 'math');
  if (!metric) {
    return null;
  }

  const { variables } = metric;
  let script: string | null | undefined = metrics[metrics.length - 1].script;
  if (!script || !variables || !variables.length) {
    return null;
  }

  const metricsWithoutMath = metrics.filter(({ type }) => type !== 'math');

  // create the script
  for (const notMathMetric of metricsWithoutMath) {
    // We can only support top_hit with size 1
    if (
      (notMathMetric.type === 'top_hit' &&
        notMathMetric?.size &&
        Number(notMathMetric?.size) !== 1) ||
      notMathMetric?.order === 'asc'
    ) {
      return null;
    }

    // should treat percentiles differently
    if (notMathMetric.type === 'percentile' || notMathMetric.type === 'percentile_rank') {
      script = convertFormulaScriptForPercentileAggs(script!, variables, notMathMetric, metrics, {
        reducedTimeRange,
        timeShift: series.offset_time,
      });
    } else {
      script = convertFormulaScriptForAggs(script!, variables, notMathMetric, metrics, {
        reducedTimeRange,
        timeShift: series.offset_time,
      });
    }
  }

  if (script === null) {
    return null;
  }

  const scripthasNoStaticNumber = isNaN(Number(script));
  if (script.includes('params') || !scripthasNoStaticNumber) {
    return null;
  }

  return createFormulaColumn(script, { series, metric, dataView });
};

export const convertOtherAggsToFormulaColumn = (
  aggregation: OtherFormulaAggregations,
  { series, metrics, dataView }: CommonColumnsConverterArgs,
  reducedTimeRange?: string
): FormulaColumn | null => {
  const metric = metrics[metrics.length - 1];
  const [fieldId, meta] = metric?.field?.split('[') ?? [];
  const subFunctionMetric = metrics.find(({ id }) => id === fieldId);
  const metaValue = meta ? Number(meta?.replace(']', '')) : undefined;

  if (!subFunctionMetric) {
    return null;
  }

  const formula = getPipelineSeriesFormula(metric, metrics, subFunctionMetric, {
    metaValue,
    reducedTimeRange,
    timeShift: series.offset_time,
  });
  if (!formula) {
    return null;
  }
  return createFormulaColumn(formula, { series, metric, dataView });
};
