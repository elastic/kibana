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
import { VisualizationContainer } from '@kbn/visualizations-common';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { VegaVisualizationDependencies } from './plugin';
import { reportVegaRender } from './lib/vega_render_telemetry';
import type { RenderValue } from './vega_fn';
import { VEGA_SANDBOX_ROUTE_PATH, VEGA_SANDBOXED_RENDERING_FLAG } from '../common/constants';
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

/** @internal **/
export const shouldUseSandboxedVegaRendering = ({
  sandboxedRenderingEnabled,
  useMap,
}: {
  sandboxedRenderingEnabled: boolean;
  useMap: boolean;
}): boolean => sandboxedRenderingEnabled && !useMap;

export const getVegaVisRenderer: (
  deps: VegaVisualizationDependencies
) => ExpressionRenderDefinition<RenderValue> = (deps) => ({
  name: 'vega_vis',
  reuseDomNode: true,
  render: async (domNode, { inspectorAdapters, visData }, handlers) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    const renderComplete = () => {
      reportVegaRender({
        containerType: extractContainerType(handlers.getExecutionContext()),
        isVegaLite: visData.isVegaLite,
        useMap: visData.useMap,
      });

      handlers.done();
    };

    const [startServices] = await deps.core.getStartServices();
    const sandboxedRenderingEnabled = startServices.featureFlags.getBooleanValue(
      VEGA_SANDBOXED_RENDERING_FLAG,
      false
    );
    const useSandbox = shouldUseSandboxedVegaRendering({
      sandboxedRenderingEnabled,
      useMap: visData.useMap,
    });
    const sandboxFrameSrc = startServices.http.basePath.prepend(VEGA_SANDBOX_ROUTE_PATH);

    render(
      <KibanaRenderContextProvider {...startServices}>
        <VisualizationContainer handlers={handlers}>
          <LazyVegaVisComponent
            deps={deps}
            fireEvent={handlers.event}
            renderComplete={renderComplete}
            renderMode={handlers.getRenderMode()}
            inspectorAdapters={inspectorAdapters}
            visData={visData}
            useSandbox={useSandbox}
            sandboxFrameSrc={sandboxFrameSrc}
          />
        </VisualizationContainer>
      </KibanaRenderContextProvider>,
      domNode
    );
  },
});
