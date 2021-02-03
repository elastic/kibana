/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { ExpressionRenderDefinition } from 'src/plugins/expressions';
import { KibanaContextProvider } from '../../kibana_react/public';
import { VisualizationContainer } from '../../visualizations/public';
import { TimelionVisDependencies } from './plugin';
import { TimelionRenderValue } from './timelion_vis_fn';
// @ts-ignore
const TimelionVisComponent = lazy(() => import('./components/timelion_vis_component'));

export const getTimelionVisRenderer: (
  deps: TimelionVisDependencies
) => ExpressionRenderDefinition<TimelionRenderValue> = (deps) => ({
  name: 'timelion_vis',
  displayName: 'Timelion visualization',
  reuseDomNode: true,
  render: (domNode, { visData, visParams }, handlers) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    const [seriesList] = visData.sheet;
    const showNoResult = !seriesList || !seriesList.list.length;

    render(
      <VisualizationContainer handlers={handlers} showNoResult={showNoResult}>
        <KibanaContextProvider services={{ ...deps }}>
          <TimelionVisComponent
            interval={visParams.interval}
            seriesList={seriesList}
            renderComplete={handlers.done}
            fireEvent={handlers.event}
          />
        </KibanaContextProvider>
      </VisualizationContainer>,
      domNode
    );
  },
});
