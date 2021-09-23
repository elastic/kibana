/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';

import { VisualizationContainer } from '../../../visualizations/public';
import type { PersistedState } from '../../../visualizations/public';
import type { ExpressionRenderDefinition } from '../../../expressions/public';

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

export const xyVisRenderer: ExpressionRenderDefinition<RenderValue> = {
  name: visName,
  displayName: 'XY visualization',
  reuseDomNode: true,
  render: async (domNode, { visData, visConfig, visType, syncColors }, handlers) => {
    const showNoResult = shouldShowNoResultsMessage(visData, visType);

    handlers.onDestroy(() => unmountComponentAtNode(domNode));
    render(
      <I18nProvider>
        <VisualizationContainer handlers={handlers} showNoResult={showNoResult}>
          <VisComponent
            visParams={visConfig}
            visData={visData}
            renderComplete={handlers.done}
            fireEvent={handlers.event}
            uiState={handlers.uiState as PersistedState}
            syncColors={syncColors}
          />
        </VisualizationContainer>
      </I18nProvider>,
      domNode
    );
  },
};
