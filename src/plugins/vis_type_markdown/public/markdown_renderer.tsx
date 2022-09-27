/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { VisualizationContainer } from '@kbn/visualizations-plugin/public';
import { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common/expression_renderers';
import { MarkdownVisRenderValue } from './markdown_fn';

// @ts-ignore
const MarkdownVisComponent = lazy(() => import('./markdown_vis_controller'));

export const markdownVisRenderer: ExpressionRenderDefinition<MarkdownVisRenderValue> = {
  name: 'markdown_vis',
  displayName: 'markdown visualization',
  reuseDomNode: true,
  render: async (domNode, { visParams }, handlers) => {
    const root = createRoot(domNode);

    handlers.onDestroy(() => {
      root.unmount();
    });

    root.render(
      <VisualizationContainer className="markdownVis" handlers={handlers}>
        <MarkdownVisComponent {...visParams} renderComplete={handlers.done} />
      </VisualizationContainer>
    );
  },
};
