/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VisToExpressionAst } from '@kbn/visualizations-plugin/public';
import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/public';
import { MarkdownVisExpressionFunctionDefinition } from './markdown_fn';
import { MarkdownVisParams } from './types';

export const toExpressionAst: VisToExpressionAst<MarkdownVisParams> = (vis) => {
  const { markdown, fontSize, openLinksInNewTab } = vis.params;

  const markdownVis = buildExpressionFunction<MarkdownVisExpressionFunctionDefinition>(
    'markdownVis',
    {
      markdown,
      font: buildExpression(`font size=${fontSize}`),
      openLinksInNewTab,
    }
  );

  const ast = buildExpression([markdownVis]);

  return ast.toAst();
};
