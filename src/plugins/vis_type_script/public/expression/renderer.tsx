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
import { VisParams } from '../types';
import { VisSandbox } from '../sandbox';

export interface RenderValue {
  visType: 'script';
  visParams: VisParams;
}

export const scriptVisRenderer: ExpressionRenderDefinition<RenderValue> = {
  name: 'script_vis',
  displayName: 'script-based visualization',
  reuseDomNode: true,
  render: async (domNode, { visParams }, handlers) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    render(
      <VisualizationContainer className="scriptVis" handlers={handlers}>
        <VisSandbox script={visParams.script} />
      </VisualizationContainer>,
      domNode
    );
  },
};
