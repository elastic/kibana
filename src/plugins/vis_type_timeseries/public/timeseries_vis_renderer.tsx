/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { IUiSettingsClient } from 'kibana/public';
import type { PersistedState } from '../../visualizations/public';
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
          uiState={handlers.uiState! as PersistedState}
        />
      </VisualizationContainer>,
      domNode
    );
  },
});
