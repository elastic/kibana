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
import { METRIC_TYPE } from '@kbn/analytics';
import { I18nProvider } from '@kbn/i18n-react';
import { IUiSettingsClient, KibanaExecutionContext, ThemeServiceStart } from '@kbn/core/public';

import { VisualizationContainer, PersistedState } from '@kbn/visualizations-plugin/public';

import type { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { getUsageCollectionStart } from './services';
import { TIME_RANGE_DATA_MODES } from '../common/enums';
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

/** @internal **/
const extractContainerType = (context?: KibanaExecutionContext): string | undefined => {
  if (context) {
    const recursiveGet = (item: KibanaExecutionContext): KibanaExecutionContext | undefined => {
      if (item.type) {
        return item;
      } else if (item.child) {
        return recursiveGet(item.child);
      }
    };
    return recursiveGet(context)?.type;
  }
};

export const getTimeseriesVisRenderer: (deps: {
  uiSettings: IUiSettingsClient;
  theme: ThemeServiceStart;
}) => ExpressionRenderDefinition<TimeseriesRenderValue> = ({ uiSettings, theme }) => ({
  name: 'timeseries_vis',
  reuseDomNode: true,
  render: async (domNode, config, handlers) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });
    const {
      visParams: model,
      visData,
      syncColors,
      syncTooltips,
      syncCursor,
      canNavigateToLens,
    } = config;
    const showNoResult = !checkIfDataExists(visData, model);

    const renderComplete = () => {
      const usageCollection = getUsageCollectionStart();
      const containerType = extractContainerType(handlers.getExecutionContext());
      const visualizationType = 'tsvb';

      if (usageCollection && containerType) {
        const counterEvents = [
          `render_${visualizationType}_${model.type}`,
          model.use_kibana_indexes === false
            ? `render_${visualizationType}_index_pattern_string`
            : undefined,
          model.time_range_mode === TIME_RANGE_DATA_MODES.LAST_VALUE
            ? `render_${visualizationType}_last_value`
            : undefined,
          canNavigateToLens ? `render_${visualizationType}_convertable` : undefined,
        ].filter(Boolean) as string[];

        usageCollection.reportUiCounter(containerType, METRIC_TYPE.COUNT, counterEvents);
      }

      handlers.done();
    };

    render(
      <I18nProvider>
        <KibanaThemeProvider theme$={theme.theme$}>
          <VisualizationContainer
            data-test-subj="timeseriesVis"
            handlers={handlers}
            renderComplete={renderComplete}
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
              syncTooltips={syncTooltips}
              syncCursor={syncCursor}
              uiState={handlers.uiState! as PersistedState}
              initialRender={renderComplete}
            />
          </VisualizationContainer>
        </KibanaThemeProvider>
      </I18nProvider>,
      domNode
    );
  },
});
