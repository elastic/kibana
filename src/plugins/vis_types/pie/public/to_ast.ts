/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getVisSchemas, VisToExpressionAst, SchemaConfig } from '../../../visualizations/public';
import { buildExpression, buildExpressionFunction } from '../../../expressions/public';
import { PieVisParams, LabelsParams } from './types';
import { vislibPieName, VisTypePieExpressionFunctionDefinition } from './pie_fn';
import { getEsaggsFn } from './to_ast_esaggs';

const prepareDimension = (params: SchemaConfig) => {
  const visdimension = buildExpressionFunction('visdimension', { accessor: params.accessor });

  if (params.format) {
    visdimension.addArgument('format', params.format.id);
    visdimension.addArgument('formatParams', JSON.stringify(params.format.params));
  }

  return buildExpression([visdimension]);
};

const prepareLabels = (params: LabelsParams) => {
  const pieLabels = buildExpressionFunction('pielabels', {
    show: params.show,
    lastLevel: params.last_level,
    values: params.values,
    truncate: params.truncate,
  });
  if (params.position) {
    pieLabels.addArgument('position', params.position);
  }
  if (params.valuesFormat) {
    pieLabels.addArgument('valuesFormat', params.valuesFormat);
  }
  if (params.percentDecimals != null) {
    pieLabels.addArgument('percentDecimals', params.percentDecimals);
  }
  return buildExpression([pieLabels]);
};

export const toExpressionAst: VisToExpressionAst<PieVisParams> = async (vis, params) => {
  const schemas = getVisSchemas(vis, params);
  const args = {
    // explicitly pass each param to prevent extra values trapping
    addTooltip: vis.params.addTooltip,
    addLegend: vis.params.addLegend,
    legendPosition: vis.params.legendPosition,
    nestedLegend: vis.params?.nestedLegend,
    truncateLegend: vis.params.truncateLegend,
    maxLegendLines: vis.params.maxLegendLines,
    distinctColors: vis.params?.distinctColors,
    isDonut: vis.params.isDonut,
    palette: vis.params?.palette?.name,
    labels: prepareLabels(vis.params.labels),
    metric: schemas.metric.map(prepareDimension),
    buckets: schemas.segment?.map(prepareDimension),
    splitColumn: schemas.split_column?.map(prepareDimension),
    splitRow: schemas.split_row?.map(prepareDimension),
  };

  const visTypePie = buildExpressionFunction<VisTypePieExpressionFunctionDefinition>(
    vislibPieName,
    args
  );

  const ast = buildExpression([getEsaggsFn(vis), visTypePie]);

  return ast.toAst();
};
