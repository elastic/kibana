/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PaletteOutput } from '@kbn/coloring';
import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/public';
import { getVisSchemas, SchemaConfig, VisToExpressionAst } from '@kbn/visualizations-plugin/public';
import { TagCloudVisParams } from './types';

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

export const toExpressionAst: VisToExpressionAst<TagCloudVisParams> = (vis, params) => {
  const schemas = getVisSchemas(vis, params);
  const { scale, orientation, minFontSize, maxFontSize, showLabel, palette } = vis.params;

  const tagcloud = buildExpressionFunction('tagcloud', {
    scale,
    orientation,
    minFontSize,
    maxFontSize,
    showLabel,
    metric: prepareDimension(schemas.metric[0]),
    palette: preparePalette(palette),
  });

  if (schemas.segment) {
    tagcloud.addArgument('bucket', prepareDimension(schemas.segment[0]));
  }

  const ast = buildExpression([tagcloud]);

  return ast.toAst();
};
