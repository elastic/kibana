/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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

    if (showNoResult) {
      // send the render complete event when there is no data to show
      // to notify that a chart is updated
      handlers.done();
    }

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
