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

import { EuiLoadingChart } from '@elastic/eui';
import { fetchIndexPattern } from '../common/index_patterns_utils';
import { VisualizationContainer, PersistedState } from '../../../visualizations/public';

import type { TimeseriesVisData } from '../common/types';
import { isVisTableData } from '../common/vis_data_utils';
import { getCharts, getDataStart } from './services';

import type { TimeseriesVisParams } from './types';
import type { ExpressionRenderDefinition } from '../../../expressions/common';
import type { TimeseriesRenderValue } from './metrics_fn';

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
    const { visParams: model, visData, syncColors } = config;
    const { palettes } = getCharts();
    const { indexPatterns } = getDataStart();

    const showNoResult = !checkIfDataExists(visData, model);

    let servicesLoaded;

    Promise.all([
      palettes.getPalettes(),
      fetchIndexPattern(model.index_pattern, indexPatterns),
    ]).then(([palettesService, { indexPattern }]) => {
      servicesLoaded = true;

      unmountComponentAtNode(domNode);

      render(
        <I18nProvider>
          <VisualizationContainer
            data-test-subj="timeseriesVis"
            handlers={handlers}
            showNoResult={showNoResult}
            error={get(visData, [model.id, 'error'])}
          >
            <TimeseriesVisualization
              // it is mandatory to bind uiSettings because of "this" usage inside "get" method
              getConfig={uiSettings.get.bind(uiSettings)}
              handlers={handlers}
              indexPattern={indexPattern}
              model={model}
              visData={visData as TimeseriesVisData}
              syncColors={syncColors}
              uiState={handlers.uiState! as PersistedState}
              palettesService={palettesService}
            />
          </VisualizationContainer>
        </I18nProvider>,
        domNode
      );
    });

    if (!servicesLoaded) {
      render(
        <div className="visChart__spinner">
          <EuiLoadingChart mono size="l" />
        </div>,
        domNode
      );
    }
  },
});
