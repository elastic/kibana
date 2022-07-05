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
import { PersistedState } from '@kbn/visualizations-plugin/public';
import { ThemeServiceStart } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common/expression_renderers';
import { EXPRESSION_GAUGE_NAME, GaugeExpressionProps, GaugeShapes } from '../../common';
import { getFormatService, getPaletteService, getThemeService } from '../services';

interface ExpressionGaugeRendererDependencies {
  theme: ThemeServiceStart;
}

export const gaugeRenderer: (
  deps: ExpressionGaugeRendererDependencies
) => ExpressionRenderDefinition<GaugeExpressionProps> = ({ theme }) => ({
  name: EXPRESSION_GAUGE_NAME,
  displayName: i18n.translate('expressionGauge.renderer.visualizationName', {
    defaultMessage: 'Gauge',
  }),
  reuseDomNode: true,
  render: async (domNode, config, handlers) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    const renderComplete = () => {
      let type: string;
      switch (config.args.shape) {
        case GaugeShapes.HORIZONTAL_BULLET:
          type = `${EXPRESSION_GAUGE_NAME}_horizontal`;
          break;
        case GaugeShapes.VERTICAL_BULLET:
          type = `${EXPRESSION_GAUGE_NAME}_vertical`;
          break;
        default:
          type = EXPRESSION_GAUGE_NAME;
      }

      if (config.context?.originatingApp) {
        handlers.logRenderTelemetry({
          originatingApp: config.context.originatingApp,
          counterEvents: type,
        });
      }

      handlers.done();
    };

    const { GaugeComponent } = await import('../components/gauge_component');
    render(
      <KibanaThemeProvider theme$={theme.theme$}>
        <div className="gauge-container" data-test-subj="gaugeChart">
          <GaugeComponent
            {...config}
            formatFactory={getFormatService().deserialize}
            chartsThemeService={getThemeService()}
            paletteService={getPaletteService()}
            renderComplete={renderComplete}
            uiState={handlers.uiState as PersistedState}
          />
        </div>
      </KibanaThemeProvider>,
      domNode
    );
  },
});
