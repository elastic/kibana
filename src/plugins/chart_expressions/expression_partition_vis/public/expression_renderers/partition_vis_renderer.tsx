/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { ClassNames } from '@emotion/react';
import { I18nProvider } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { Datatable, ExpressionRenderDefinition } from '../../../../expressions/public';
import { VisualizationContainer } from '../../../../visualizations/public';
import type { PersistedState } from '../../../../visualizations/public';
import { KibanaThemeProvider } from '../../../../kibana_react/public';

import { PARTITION_VIS_RENDERER_NAME } from '../../common/constants';
import { ChartTypes, RenderValue } from '../../common/types';

import { VisTypePieDependencies } from '../plugin';

export const strings = {
  getDisplayName: () =>
    i18n.translate('expressionPartitionVis.renderer.pieVis.displayName', {
      defaultMessage: 'Pie visualization',
    }),
  getHelpDescription: () =>
    i18n.translate('expressionPartitionVis.renderer.pieVis.helpDescription', {
      defaultMessage: 'Render a pie',
    }),
};

const PartitionVisComponent = lazy(() => import('../components/partition_vis_component'));

function shouldShowNoResultsMessage(visData: Datatable | undefined): boolean {
  const rows: object[] | undefined = visData?.rows;
  const isZeroHits = !rows || !rows.length;

  return Boolean(isZeroHits);
}

const partitionVisClass = { height: '100%' };

export const getPartitionVisRenderer: (
  deps: VisTypePieDependencies
) => ExpressionRenderDefinition<RenderValue> = ({ theme, palettes, getStartDeps }) => ({
  name: PARTITION_VIS_RENDERER_NAME,
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  render: async (domNode, { visConfig, visData, visType, syncColors }, handlers) => {
    const showNoResult = shouldShowNoResultsMessage(visData);

    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    const services = await getStartDeps();
    const palettesRegistry = await palettes.getPalettes();

    render(
      <I18nProvider>
        <KibanaThemeProvider theme$={services.kibanaTheme.theme$}>
          <ClassNames>
            {({ css, cx }) => (
              <VisualizationContainer
                handlers={handlers}
                showNoResult={showNoResult}
                className={cx('partitionVisContainer', css(partitionVisClass))}
              >
                <PartitionVisComponent
                  chartsThemeService={theme}
                  palettesRegistry={palettesRegistry}
                  visParams={visConfig}
                  visData={visData}
                  visType={visConfig.isDonut ? ChartTypes.DONUT : visType}
                  renderComplete={handlers.done}
                  fireEvent={handlers.event}
                  uiState={handlers.uiState as PersistedState}
                  services={{ data: services.data, fieldFormats: services.fieldFormats }}
                  syncColors={syncColors}
                />
              </VisualizationContainer>
            )}
          </ClassNames>
        </KibanaThemeProvider>
      </I18nProvider>,
      domNode,
      () => {
        handlers.done();
      }
    );
  },
});
