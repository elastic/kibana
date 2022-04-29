/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { IExternalUrl, IUiSettingsClient } from '@kbn/core/public';
import type { ExpressionRenderDefinition } from '@kbn/expressions-plugin';
import { VisualizationContainer } from '@kbn/visualizations-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { VisParams, VisSearchContext } from '../types';
import { ScriptRenderer } from '../renderer';
import { VisTypeScriptKibanaApi } from '../kibana_api';

export interface RenderValue {
  visType: 'script';
  visParams: VisParams;
  visSearchContext: VisSearchContext;
}

export const scriptVisRenderer: (
  // TODO: not sure if this is correct way of passing deps to vis renderer
  getDeps: () => Promise<{
    data: DataPublicPluginStart;
    uiSettingsClient: IUiSettingsClient;
    validateUrl: IExternalUrl['validateUrl'];
    nonce: string;
  }>
) => ExpressionRenderDefinition<RenderValue> = (getDeps) => ({
  name: 'script_vis',
  displayName: 'script-based visualization',
  reuseDomNode: true,
  render: async (domNode, { visParams, visSearchContext }, handlers) => {
    const deps = await getDeps();
    const visTypeScriptKibanaApi = new VisTypeScriptKibanaApi(deps, visSearchContext);

    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    // hack to always force re-render the iframe to pick up the latest state and to react on "refresh"
    const keyToForceRerenderScript = Date.now();

    render(
      <VisualizationContainer className="scriptVis" handlers={handlers}>
        <ScriptRenderer
          key={keyToForceRerenderScript}
          script={visParams.script}
          dependencyUrls={visParams.dependencyUrls}
          kibanaApi={visTypeScriptKibanaApi}
          validateUrl={deps.validateUrl}
          nonce={deps.nonce}
        />
      </VisualizationContainer>,
      domNode
    );
  },
});
