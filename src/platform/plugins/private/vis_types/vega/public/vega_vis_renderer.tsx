/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { METRIC_TYPE } from '@kbn/analytics';
import { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { VisualizationContainer } from '@kbn/visualizations-plugin/public';
import { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import { VegaVisualizationDependencies } from './plugin';
import { getUsageCollectionStart } from './services';
import { RenderValue } from './vega_fn';
const LazyVegaVisComponent = lazy(() =>
  import('./async_services').then(({ VegaVisComponent }) => ({ default: VegaVisComponent }))
);

/** @internal **/
const extractContainerType = (context?: KibanaExecutionContext): string | undefined => {
  if (context) {
    const recursiveGet = (item: KibanaExecutionContext): KibanaExecutionContext | undefined => {
      if (item.type) {
        return item;
      } else if (item.child) {
        return recursiveGet(item.child);
      }
    };
    return recursiveGet(context)?.type;
  }
};

export const getVegaVisRenderer: (
  deps: VegaVisualizationDependencies
) => ExpressionRenderDefinition<RenderValue> = (deps) => ({
  name: 'vega_vis',
  reuseDomNode: true,
  render: async (domNode, { visData }, handlers) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    const renderComplete = () => {
      const usageCollection = getUsageCollectionStart();
      const containerType = extractContainerType(handlers.getExecutionContext());
      const visualizationType = 'vega';

      if (usageCollection && containerType) {
        const counterEvents = [
          `render_${visualizationType}`,
          visData.useMap ? `render_${visualizationType}_map` : undefined,
          `render_${visualizationType}_${visData.isVegaLite ? 'lite' : 'normal'}`,
        ].filter(Boolean) as string[];

        usageCollection.reportUiCounter(containerType, METRIC_TYPE.COUNT, counterEvents);
      }

      handlers.done();
    };

    const [startServices] = await deps.core.getStartServices();

    render(
      <KibanaRenderContextProvider {...startServices}>
        <VisualizationContainer handlers={handlers}>
          <LazyVegaVisComponent
            deps={deps}
            fireEvent={handlers.event}
            renderComplete={renderComplete}
            renderMode={handlers.getRenderMode()}
            visData={visData}
          />
        </VisualizationContainer>
      </KibanaRenderContextProvider>,
      domNode
    );
  },
});
