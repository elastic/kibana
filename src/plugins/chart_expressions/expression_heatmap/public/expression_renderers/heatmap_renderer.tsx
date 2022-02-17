/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import type { PersistedState } from '../../../../visualizations/public';
import { ThemeServiceStart } from '../../../../../core/public';
import { KibanaThemeProvider } from '../../../../kibana_react/public';
import { ExpressionRenderDefinition } from '../../../../expressions/common/expression_renderers';
import {
  EXPRESSION_HEATMAP_NAME,
  HeatmapExpressionProps,
  FilterEvent,
  BrushEvent,
} from '../../common';
import { getFormatService, getPaletteService, getUISettings, getThemeService } from '../services';
import { getTimeZone } from '../utils/get_timezone';

interface ExpressioHeatmapRendererDependencies {
  theme: ThemeServiceStart;
}

export const heatmapRenderer: (
  deps: ExpressioHeatmapRendererDependencies
) => ExpressionRenderDefinition<HeatmapExpressionProps> = ({ theme }) => ({
  name: EXPRESSION_HEATMAP_NAME,
  displayName: i18n.translate('expressionHeatmap.visualizationName', {
    defaultMessage: 'Heatmap',
  }),
  reuseDomNode: true,
  render: async (domNode, config, handlers) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });
    const onClickValue = (data: FilterEvent['data']) => {
      handlers.event({ name: 'filter', data });
    };
    const onSelectRange = (data: BrushEvent['data']) => {
      handlers.event({ name: 'brush', data });
    };

    const timeZone = getTimeZone(getUISettings());
    const { HeatmapComponent } = await import('../components/heatmap_component');
    const { isInteractive } = handlers;
    render(
      <KibanaThemeProvider theme$={theme.theme$}>
        <div className="heatmap-container" data-test-subj="heatmapChart">
          <HeatmapComponent
            {...config}
            onClickValue={onClickValue}
            onSelectRange={onSelectRange}
            timeZone={timeZone}
            formatFactory={getFormatService().deserialize}
            chartsThemeService={getThemeService()}
            paletteService={getPaletteService()}
            uiState={handlers.uiState as PersistedState}
            interactive={isInteractive()}
          />
        </div>
      </KibanaThemeProvider>,
      domNode,
      () => {
        handlers.done();
      }
    );
  },
});
