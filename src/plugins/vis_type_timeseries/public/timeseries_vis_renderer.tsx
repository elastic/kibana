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

import { IUiSettingsClient } from 'kibana/public';
import { VisualizationContainer } from '../../visualizations/public';
import { ExpressionRenderDefinition } from '../../expressions/common/expression_renderers';
import { TimeseriesRenderValue, TimeseriesVisParams } from './metrics_fn';
import { TimeseriesVisData } from '../common/types';

const TimeseriesVisualization = lazy(
  () => import('./application/components/timeseries_visualization')
);

const checkIfDataExists = (visData: TimeseriesVisData | {}, model: TimeseriesVisParams) => {
  if ('type' in visData) {
    const data = visData.type === 'table' ? visData.series : visData?.[model.id]?.series;
    return Boolean(data?.length);
  }

  return false;
};

export const getTimeseriesVisRenderer: (deps: {
  uiSettings: IUiSettingsClient;
}) => ExpressionRenderDefinition<TimeseriesRenderValue> = ({ uiSettings }) => ({
  name: 'timeseries_vis',
  reuseDomNode: true,
  render: async (domNode, config, handlers) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    const showNoResult = !checkIfDataExists(config.visData, config.visParams);

    render(
      <VisualizationContainer
        data-test-subj="timeseriesVis"
        handlers={handlers}
        showNoResult={showNoResult}
      >
        <TimeseriesVisualization
          // it is mandatory to bind uiSettings because of "this" usage inside "get" method
          getConfig={uiSettings.get.bind(uiSettings)}
          handlers={handlers}
          model={config.visParams}
          visData={config.visData as TimeseriesVisData}
          uiState={handlers.uiState!}
        />
      </VisualizationContainer>,
      domNode
    );
  },
});
