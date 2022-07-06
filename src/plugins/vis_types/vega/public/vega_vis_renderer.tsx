/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { METRIC_TYPE } from '@kbn/analytics';
import { ExpressionRenderDefinition } from '@kbn/expressions-plugin';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { VisualizationContainer } from '@kbn/visualizations-plugin/public';
import { VegaVisualizationDependencies } from './plugin';
import { getUsageCollectionStart } from './services';
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

    const renderComplete = () => {
      const usageCollection = getUsageCollectionStart();
      const originatingApp = 'vega';

      if (usageCollection) {
        const counterEvents = [
          `render_${originatingApp}`,
          visData.useMap ? `render_${originatingApp}_map` : undefined,
          `render_${originatingApp}_${visData.isVegaLite ? 'lite' : 'normal'}`,
        ].filter(Boolean) as string[];

        usageCollection?.reportUiCounter(originatingApp, METRIC_TYPE.COUNT, counterEvents);
      }

      handlers.done();
    };

    render(
      <KibanaThemeProvider theme$={deps.core.theme.theme$}>
        <VisualizationContainer handlers={handlers}>
          <LazyVegaVisComponent
            deps={deps}
            fireEvent={handlers.event}
            renderComplete={renderComplete}
            renderMode={handlers.getRenderMode()}
            visData={visData}
          />
        </VisualizationContainer>
      </KibanaThemeProvider>,
      domNode
    );
  },
});
