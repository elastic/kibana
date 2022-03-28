/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n-react';
import { ThemeServiceStart } from 'kibana/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { ChartsPluginStart, PaletteRegistry } from '../../../../charts/public';
import { EventAnnotationServiceType } from '../../../../event_annotation/public';
import { ExpressionRenderDefinition } from '../../../../expressions';
import { FormatFactory } from '../../../../field_formats/common';
import { KibanaThemeProvider } from '../../../../kibana_react/public';
import { XYChartProps } from '../../common';
import { calculateMinInterval } from '../helpers';
import { BrushEvent, FilterEvent } from '../types';

export type GetStartDepsFn = () => Promise<{
  formatFactory: FormatFactory;
  theme: ChartsPluginStart['theme'];
  activeCursor: ChartsPluginStart['activeCursor'];
  paletteService: PaletteRegistry;
  timeZone: string;
  useLegacyTimeAxis: boolean;
  kibanaTheme: ThemeServiceStart;
  eventAnnotationService: EventAnnotationServiceType;
}>;

interface XyChartRendererDeps {
  getStartDeps: GetStartDepsFn;
}

export const getXyChartRenderer = ({
  getStartDeps,
}: XyChartRendererDeps): ExpressionRenderDefinition<XYChartProps> => ({
  name: 'xyVis',
  displayName: 'XY chart',
  help: i18n.translate('expressionXY.xyVis.renderer.help', {
    defaultMessage: 'X/Y chart renderer',
  }),
  validate: () => undefined,
  reuseDomNode: true,
  render: async (domNode: Element, config: XYChartProps, handlers) => {
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
    const onClickValue = (data: FilterEvent['data']) => {
      handlers.event({ name: 'filter', data });
    };
    const onSelectRange = (data: BrushEvent['data']) => {
      handlers.event({ name: 'brush', data });
    };
    const deps = await getStartDeps();

    const { XYChartReportable } = await import('../components/xy_chart');

    ReactDOM.render(
      <KibanaThemeProvider theme$={deps.kibanaTheme.theme$}>
        <I18nProvider>
          <div
            style={{ width: '100%', height: '100%', overflowX: 'hidden' }}
            data-test-subj="xyVisChart"
          >
            <XYChartReportable
              {...config}
              formatFactory={deps.formatFactory}
              chartsActiveCursorService={deps.activeCursor}
              chartsThemeService={deps.theme}
              paletteService={deps.paletteService}
              timeZone={deps.timeZone}
              eventAnnotationService={deps.eventAnnotationService}
              useLegacyTimeAxis={deps.useLegacyTimeAxis}
              minInterval={calculateMinInterval(config)}
              interactive={handlers.isInteractive()}
              onClickValue={onClickValue}
              onSelectRange={onSelectRange}
              renderMode={handlers.getRenderMode()}
              syncColors={handlers.isSyncColorsEnabled()}
            />
          </div>{' '}
        </I18nProvider>
      </KibanaThemeProvider>,
      domNode,
      () => handlers.done()
    );
  },
});
