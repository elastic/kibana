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
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ExpressionRenderDefinition } from '@kbn/expressions-plugin/public';
import type { PersistedState } from '@kbn/visualizations-plugin/public';
import { withSuspense } from '@kbn/presentation-util-plugin/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { VisTypePieDependencies } from '../plugin';
import { PARTITION_VIS_RENDERER_NAME } from '../../common/constants';
import { ChartTypes, RenderValue } from '../../common/types';

export const strings = {
  getDisplayName: () =>
    i18n.translate('expressionPartitionVis.renderer.partitionVis.pie.displayName', {
      defaultMessage: 'Partition visualization',
    }),
  getHelpDescription: () =>
    i18n.translate('expressionPartitionVis.renderer.partitionVis.pie.helpDescription', {
      defaultMessage: 'Render pie/donut/treemap/mosaic/waffle charts',
    }),
};

const LazyPartitionVisComponent = lazy(() => import('../components/partition_vis_component'));
const PartitionVisComponent = withSuspense(LazyPartitionVisComponent);

const partitionVisRenderer = css({
  position: 'relative',
  width: '100%',
  height: '100%',
});

export const getPartitionVisRenderer: (
  deps: VisTypePieDependencies
) => ExpressionRenderDefinition<RenderValue> = ({ theme, palettes, getStartDeps }) => ({
  name: PARTITION_VIS_RENDERER_NAME,
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  render: async (domNode, { visConfig, visData, visType, syncColors }, handlers) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    const services = await getStartDeps();
    const palettesRegistry = await palettes.getPalettes();

    render(
      <I18nProvider>
        <KibanaThemeProvider theme$={services.kibanaTheme.theme$}>
          <div css={partitionVisRenderer}>
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
          </div>
        </KibanaThemeProvider>
      </I18nProvider>,
      domNode,
      () => {
        handlers.done();
      }
    );
  },
});
