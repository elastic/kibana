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

import { I18nProvider } from '@kbn/i18n-react';
import { IUiSettingsClient, ThemeServiceStart } from '@kbn/core/public';

import { VisualizationContainer, PersistedState } from '@kbn/visualizations-plugin/public';

import type { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import type { TimeseriesVisData } from '../common/types';
import { isVisTableData } from '../common/vis_data_utils';

import type { TimeseriesVisParams } from './types';
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
  theme: ThemeServiceStart;
}) => ExpressionRenderDefinition<TimeseriesRenderValue> = ({ uiSettings, theme }) => ({
  name: 'timeseries_vis',
  reuseDomNode: true,
  render: async (domNode, config, handlers) => {
    // Build optimization. Move app styles from main bundle
    // @ts-expect-error TS error, cannot find type declaration for scss
    import('./application/index.scss');

    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });
    const { visParams: model, visData, syncColors } = config;

    const showNoResult = !checkIfDataExists(visData, model);

    render(
      <I18nProvider>
        <KibanaThemeProvider theme$={theme.theme$}>
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
              model={model}
              visData={visData as TimeseriesVisData}
              syncColors={syncColors}
              uiState={handlers.uiState! as PersistedState}
            />
          </VisualizationContainer>
        </KibanaThemeProvider>
      </I18nProvider>,
      domNode,
      () => {
        handlers.done();
      }
    );
  },
});
