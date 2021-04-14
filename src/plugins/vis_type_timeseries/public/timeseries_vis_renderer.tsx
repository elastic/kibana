/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy } from 'react';
import { get } from 'lodash';
import { render, unmountComponentAtNode } from 'react-dom';

import { I18nProvider } from '@kbn/i18n/react';
import { IUiSettingsClient } from 'kibana/public';
import type { PersistedState } from '../../visualizations/public';
import { VisualizationContainer } from '../../visualizations/public';
import { ExpressionRenderDefinition } from '../../expressions/common/expression_renderers';
import { TimeseriesRenderValue } from './metrics_fn';
import { isVisTableData, TimeseriesVisData } from '../common/types';
import { TimeseriesVisParams } from './types';
import { getChartsSetup } from './services';

const TimeseriesVisualization = lazy(
  () => import('./application/components/timeseries_visualization')
);

const checkIfDataExists = (visData: TimeseriesVisData | {}, model: TimeseriesVisParams) => {
  if ('type' in visData) {
    const data = isVisTableData(visData) ? visData.series : visData?.[model.id]?.series;
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
    const { palettes } = getChartsSetup();
    const showNoResult = !checkIfDataExists(config.visData, config.visParams);
    const palettesService = await palettes.getPalettes();

    render(
      <I18nProvider>
        <VisualizationContainer
          data-test-subj="timeseriesVis"
          handlers={handlers}
          showNoResult={showNoResult}
          error={get(config.visData, [config.visParams.id, 'error'])}
        >
          <TimeseriesVisualization
            // it is mandatory to bind uiSettings because of "this" usage inside "get" method
            getConfig={uiSettings.get.bind(uiSettings)}
            handlers={handlers}
            model={config.visParams}
            visData={config.visData as TimeseriesVisData}
            syncColors={config.syncColors}
            uiState={handlers.uiState! as PersistedState}
            palettesService={palettesService}
          />
        </VisualizationContainer>
      </I18nProvider>,
      domNode
    );
  },
});
