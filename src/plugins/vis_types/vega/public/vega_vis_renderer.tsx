/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { ExpressionRenderDefinition } from 'src/plugins/expressions';
import { KibanaThemeProvider } from '../../../kibana_react/public';
import { VisualizationContainer } from '../../../visualizations/public';
import { VegaVisualizationDependencies } from './plugin';
import { RenderValue } from './vega_fn';
const LazyVegaVisComponent = lazy(() =>
  import('./async_services').then(({ VegaVisComponent }) => ({ default: VegaVisComponent }))
);

export const getVegaVisRenderer: (
  deps: VegaVisualizationDependencies
) => ExpressionRenderDefinition<RenderValue> = (deps) => ({
  name: 'vega_vis',
  reuseDomNode: true,
  render: (domNode, { visData }, handlers) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });
    render(
      <KibanaThemeProvider theme$={deps.core.theme.theme$}>
        <VisualizationContainer handlers={handlers}>
          <LazyVegaVisComponent
            deps={deps}
            fireEvent={handlers.event}
            renderComplete={handlers.done}
            renderMode={handlers.getRenderMode()}
            visData={visData}
          />
        </VisualizationContainer>
      </KibanaThemeProvider>,
      domNode
    );
  },
});
