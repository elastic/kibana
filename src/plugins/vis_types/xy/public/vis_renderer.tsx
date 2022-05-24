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
import { IUiSettingsClient, ThemeServiceStart } from '@kbn/core/public';

import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { VisualizationContainer } from '@kbn/visualizations-plugin/public';
import type { PersistedState } from '@kbn/visualizations-plugin/public';
import type { ExpressionRenderDefinition } from '@kbn/expressions-plugin/public';

import { LEGACY_TIME_AXIS } from '@kbn/charts-plugin/common';
import type { XyVisType } from '../common';
import type { VisComponentType } from './vis_component';
import { RenderValue, visName } from './expression_functions/xy_vis_fn';

// @ts-ignore
const VisComponent = lazy<VisComponentType>(() => import('./vis_component'));

function shouldShowNoResultsMessage(visData: any, visType: XyVisType): boolean {
  const rows: object[] | undefined = visData?.rows;
  const isZeroHits = visData?.hits === 0 || (rows && !rows.length);

  return Boolean(isZeroHits);
}

export const getXYVisRenderer: (deps: {
  uiSettings: IUiSettingsClient;
  theme: ThemeServiceStart;
}) => ExpressionRenderDefinition<RenderValue> = ({ uiSettings, theme }) => ({
  name: visName,
  displayName: 'XY visualization',
  reuseDomNode: true,
  render: async (domNode, { visData, visConfig, visType, syncColors, syncTooltips }, handlers) => {
    const showNoResult = shouldShowNoResultsMessage(visData, visType);

    handlers.onDestroy(() => unmountComponentAtNode(domNode));
    render(
      <KibanaThemeProvider theme$={theme.theme$}>
        <I18nProvider>
          <VisualizationContainer handlers={handlers} showNoResult={showNoResult}>
            <VisComponent
              visParams={visConfig}
              visData={visData}
              renderComplete={handlers.done}
              fireEvent={handlers.event}
              uiState={handlers.uiState as PersistedState}
              syncColors={syncColors}
              syncTooltips={syncTooltips}
              useLegacyTimeAxis={uiSettings.get(LEGACY_TIME_AXIS, false)}
            />
          </VisualizationContainer>
        </I18nProvider>
      </KibanaThemeProvider>,
      domNode
    );
  },
});
