/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import type { ExpressionRenderDefinition } from '../../../expressions';
import { VisualizationContainer } from '../../../visualizations/public';
import { VisParams, VisSearchContext } from '../types';
import { ScriptRenderer } from '../renderer';
import { VisTypeScriptKibanaApi } from '../kibana_api';
import { DataPublicPluginStart } from '../../../data/public';

export interface RenderValue {
  visType: 'script';
  visParams: VisParams;
  visSearchContext: VisSearchContext;
}

export const scriptVisRenderer: (
  getDeps: () => Promise<{ data: DataPublicPluginStart }> // TODO: not sure if this is correct way of passing deps to vis renderer
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

    render(
      <VisualizationContainer className="scriptVis" handlers={handlers}>
        <ScriptRenderer script={visParams.script} kibanaApi={visTypeScriptKibanaApi} />
      </VisualizationContainer>,
      domNode
    );
  },
});
