/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { VisualizationContainer } from '../../visualizations/public';
import { ExpressionRenderDefinition } from '../../expressions/common/expression_renderers';
import { MarkdownVisRenderValue } from './markdown_fn';

// @ts-ignore
const MarkdownVisComponent = lazy(() => import('./markdown_vis_controller'));

export const markdownVisRenderer: ExpressionRenderDefinition<MarkdownVisRenderValue> = {
  name: 'markdown_vis',
  displayName: 'markdown visualization',
  reuseDomNode: true,
  render: async (domNode, { visParams }, handlers) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    render(
      <VisualizationContainer className="markdownVis" handlers={handlers}>
        <MarkdownVisComponent {...visParams} renderComplete={handlers.done} />
      </VisualizationContainer>,
      domNode
    );
  },
};
