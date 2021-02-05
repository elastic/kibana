/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Vis } from '../../visualizations/public';
import { buildExpression, buildExpressionFunction } from '../../expressions/public';
import { MarkdownVisExpressionFunctionDefinition } from './markdown_fn';

export const toExpressionAst = (vis: Vis) => {
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
