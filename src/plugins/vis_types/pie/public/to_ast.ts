/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PaletteOutput } from '@kbn/coloring';
import {
  getVisSchemas,
  VisToExpressionAst,
  SchemaConfig,
  DEFAULT_LEGEND_SIZE,
} from '../../../visualizations/public';
import { buildExpression, buildExpressionFunction } from '../../../expressions/public';
import {
  PIE_VIS_EXPRESSION_NAME,
  PARTITION_LABELS_FUNCTION,
  PieVisExpressionFunctionDefinition,
  PartitionVisParams,
  LabelsParams,
} from '../../../chart_expressions/expression_partition_vis/common';
import { getEsaggsFn } from './to_ast_esaggs';

const prepareDimension = (params: SchemaConfig) => {
  const visdimension = buildExpressionFunction('visdimension', { accessor: params.accessor });

  if (params.format) {
    visdimension.addArgument('format', params.format.id);
    visdimension.addArgument('formatParams', JSON.stringify(params.format.params));
  }

  return buildExpression([visdimension]);
};

const preparePalette = (palette?: PaletteOutput) => {
  const paletteExpressionFunction = buildExpressionFunction('system_palette', {
    name: palette?.name,
  });
  return buildExpression([paletteExpressionFunction]);
};

const prepareLabels = (params: LabelsParams) => {
  const pieLabels = buildExpressionFunction(PARTITION_LABELS_FUNCTION, {
    show: params.show,
    last_level: params.last_level,
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

export const toExpressionAst: VisToExpressionAst<PartitionVisParams> = async (vis, params) => {
  const schemas = getVisSchemas(vis, params);
  const args = {
    // explicitly pass each param to prevent extra values trapping
    addTooltip: vis.params.addTooltip,
    legendDisplay: vis.params.legendDisplay,
    legendPosition: vis.params.legendPosition,
    nestedLegend: vis.params?.nestedLegend ?? false,
    truncateLegend: vis.params.truncateLegend,
    maxLegendLines: vis.params.maxLegendLines,
    legendSize: vis.params.legendSize ?? DEFAULT_LEGEND_SIZE,
    distinctColors: vis.params?.distinctColors,
    isDonut: vis.params.isDonut ?? false,
    emptySizeRatio: vis.params.emptySizeRatio,
    palette: preparePalette(vis.params?.palette),
    labels: prepareLabels(vis.params.labels),
    metric: schemas.metric.map(prepareDimension),
    buckets: schemas.segment?.map(prepareDimension),
    splitColumn: schemas.split_column?.map(prepareDimension),
    splitRow: schemas.split_row?.map(prepareDimension),
    startFromSecondLargestSlice: false,
  };

  const visTypePie = buildExpressionFunction<PieVisExpressionFunctionDefinition>(
    PIE_VIS_EXPRESSION_NAME,
    args
  );

  const ast = buildExpression([getEsaggsFn(vis), visTypePie]);

  return ast.toAst();
};
