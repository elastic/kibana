/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaExecutionContext } from '@kbn/core-execution-context-common';

import { METRIC_TYPE } from '@kbn/analytics';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { VisualizationContainer } from '@kbn/visualizations-plugin/public';
import type { PersistedState } from '@kbn/visualizations-plugin/public';
import type { ExpressionRenderDefinition } from '@kbn/expressions-plugin/public';

import { LEGACY_TIME_AXIS } from '@kbn/charts-plugin/common';
import { StartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import type { XyVisType } from '../common';
import type { VisComponentType } from './vis_component';
import { RenderValue, visName } from './expression_functions/xy_vis_fn';
import { VisTypeXyPluginStartDependencies } from './plugin';

// @ts-ignore
const VisComponent = lazy<VisComponentType>(() => import('./vis_component'));

function shouldShowNoResultsMessage(visData: any, visType: XyVisType): boolean {
  const rows: object[] | undefined = visData?.rows;
  const isZeroHits = visData?.hits === 0 || (rows && !rows.length);

  return Boolean(isZeroHits);
}

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

export const getXYVisRenderer: (deps: {
  getStartDeps: StartServicesGetter<VisTypeXyPluginStartDependencies>;
}) => ExpressionRenderDefinition<RenderValue> = ({ getStartDeps }) => ({
  name: visName,
  displayName: 'XY visualization',
  reuseDomNode: true,
  render: async (domNode, { visData, visConfig, visType, syncColors, syncTooltips }, handlers) => {
    const { core, plugins } = getStartDeps();
    const showNoResult = shouldShowNoResultsMessage(visData, visType);

    const renderComplete = () => {
      // Renaming according to business requirements
      const visTypeTelemetryMap: Record<string, string> = {
        histogram: 'vertical_bar',
      };
      const containerType = extractContainerType(handlers.getExecutionContext());
      const visualizationType = 'agg_based';

      if (plugins.usageCollection && containerType) {
        const hasMixedXY = new Set(visConfig.seriesParams.map((item) => item.type));
        const counterEvents = [
          `render_${visualizationType}_${visTypeTelemetryMap[visType] ?? visType}`,
          hasMixedXY.size > 1 ? `render_${visualizationType}_mixed_xy` : undefined,
        ].filter(Boolean) as string[];

        plugins.usageCollection.reportUiCounter(containerType, METRIC_TYPE.COUNT, counterEvents);
      }

      handlers.done();
    };

    handlers.onDestroy(() => unmountComponentAtNode(domNode));

    render(
      <KibanaThemeProvider theme$={core.theme.theme$}>
        <I18nProvider>
          <VisualizationContainer
            renderComplete={renderComplete}
            handlers={handlers}
            showNoResult={showNoResult}
          >
            <VisComponent
              visParams={visConfig}
              visData={visData}
              renderComplete={renderComplete}
              fireEvent={handlers.event}
              uiState={handlers.uiState as PersistedState}
              syncColors={syncColors}
              syncTooltips={syncTooltips}
              useLegacyTimeAxis={core.uiSettings.get(LEGACY_TIME_AXIS, false)}
            />
          </VisualizationContainer>
        </I18nProvider>
      </KibanaThemeProvider>,
      domNode
    );
  },
});
