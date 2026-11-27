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
import type { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { VisualizationContainer } from '@kbn/visualizations-components';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { FilterableSource } from '@kbn/data-source';
import type { VegaVisualizationDependencies } from './plugin';
import { reportVegaRender } from './lib/vega_render_telemetry';
import { resolveVegaDataSourcesOfText } from './lib/vega_data_sources';
import type { RenderValue } from './vega_fn';
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
  render: async (domNode, { visData, visConfig, inspectorAdapters }, handlers) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    // Nothing holds the sources of a legacy visualization, so a chart filter resolves them once.
    let dataSources: Promise<FilterableSource[]> | undefined;
    const getDataSources = () => (dataSources ??= resolveVegaDataSourcesOfText(visConfig.spec));

    const renderComplete = () => {
      reportVegaRender({
        containerType: extractContainerType(handlers.getExecutionContext()),
        isVegaLite: visData.isVegaLite,
        useMap: visData.useMap,
      });

      handlers.done();
    };

    const [startServices] = await deps.core.getStartServices();

    render(
      <KibanaRenderContextProvider {...startServices}>
        <VisualizationContainer handlers={handlers}>
          <LazyVegaVisComponent
            deps={deps}
            fireEvent={handlers.event}
            inspectorAdapters={inspectorAdapters}
            renderComplete={renderComplete}
            // Adapts the Expressions render mode to Vega's own contract. Historically any mode
            // other than `view` — the Visualize editor's `edit` in practice — showed warnings.
            showWarnings={handlers.getRenderMode() !== 'view'}
            visData={visData}
            getDataSources={getDataSources}
          />
        </VisualizationContainer>
      </KibanaRenderContextProvider>,
      domNode
    );
  },
});
