/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { VisualizationContainer } from '@kbn/visualizations-plugin/public';
import { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common/expression_renderers';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import { MarkdownVisRenderValue } from './markdown_fn';

/** @internal **/
export interface MarkdownVisRendererDependencies {
  getStartDeps: StartServicesAccessor;
}

// @ts-ignore
const MarkdownVisComponent = lazy(() => import('./markdown_vis_controller'));

export const getMarkdownVisRenderer: ({
  getStartDeps,
}: MarkdownVisRendererDependencies) => ExpressionRenderDefinition<MarkdownVisRenderValue> = ({
  getStartDeps,
}) => ({
  name: 'markdown_vis',
  displayName: 'markdown visualization',
  reuseDomNode: true,
  render: async (domNode, { visParams }, handlers) => {
    const [core] = await getStartDeps();

    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    render(
      <KibanaRenderContextProvider {...core}>
        <VisualizationContainer className="markdownVis" handlers={handlers}>
          <MarkdownVisComponent {...visParams} renderComplete={handlers.done} />
        </VisualizationContainer>
      </KibanaRenderContextProvider>,
      domNode
    );
  },
});
