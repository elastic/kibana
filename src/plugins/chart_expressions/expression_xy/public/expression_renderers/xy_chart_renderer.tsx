/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n-react';
import { ThemeServiceStart } from '@kbn/core/public';
import React from 'react';
import ReactDOM from 'react-dom';
import type { PaletteRegistry } from '@kbn/coloring';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import { ExpressionRenderDefinition } from '@kbn/expressions-plugin';
import { FormatFactory } from '@kbn/field-formats-plugin/common';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { LayerTypes, SeriesTypes } from '../../common/constants';
import type { CommonXYLayerConfig, DataLayerArgs, XYChartProps } from '../../common';
import type { BrushEvent, FilterEvent } from '../types';

export type GetStartDepsFn = () => Promise<{
  data: DataPublicPluginStart;
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

const extractRenderTelemetryContext = (originatingApp: string, layers: CommonXYLayerConfig[]) => {
  const dataLayer = layers.find((l) => l.layerType === LayerTypes.DATA) as DataLayerArgs;

  if (dataLayer) {
    const type =
      dataLayer.seriesType === SeriesTypes.BAR
        ? `${dataLayer.isHorizontal ? 'horizontal_bar' : 'vertical_bar'}`
        : dataLayer.seriesType;

    const isPercentageOrStacked = [
      dataLayer.isPercentage ? 'percentage' : undefined,
      dataLayer.isStacked ? 'stacked' : undefined,
    ];

    const byTypes = layers.reduce(
      (acc, item) => {
        acc[item.layerType] += 1;
        return acc;
      },
      {
        [LayerTypes.REFERENCELINE]: 0,
        [LayerTypes.ANNOTATIONS]: 0,
        [LayerTypes.DATA]: 0,
      }
    );

    return {
      visGroup: originatingApp,
      extra: [
        type,
        isPercentageOrStacked
          ? `${type}_${isPercentageOrStacked.filter(Boolean).join('_')}`
          : undefined,
        byTypes[LayerTypes.REFERENCELINE] ? 'reference_layer' : undefined,
        byTypes[LayerTypes.ANNOTATIONS] ? 'annotation_layer' : undefined,
        byTypes[LayerTypes.DATA] > 1 ? 'multiple_data_layers' : undefined,
      ],
      onlyExtra: true,
    };
  }
};

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

    const renderComplete = () => {
      const { originatingApp } = config.context ?? {};
      if (originatingApp) {
        const context = extractRenderTelemetryContext(originatingApp, config.args.layers);
        if (context) {
          handlers.logRenderTelemetry(context);
        }
      }
      handlers.done();
    };

    const deps = await getStartDeps();

    const [{ XYChartReportable }, { calculateMinInterval }] = await Promise.all([
      import('../components/xy_chart'),
      import('../helpers/interval'),
    ]);

    ReactDOM.render(
      <KibanaThemeProvider theme$={deps.kibanaTheme.theme$}>
        <I18nProvider>
          <div
            style={{ width: '100%', height: '100%', overflowX: 'hidden' }}
            data-test-subj="xyVisChart"
          >
            <XYChartReportable
              {...config}
              data={deps.data}
              formatFactory={deps.formatFactory}
              chartsActiveCursorService={deps.activeCursor}
              chartsThemeService={deps.theme}
              paletteService={deps.paletteService}
              timeZone={deps.timeZone}
              eventAnnotationService={deps.eventAnnotationService}
              useLegacyTimeAxis={deps.useLegacyTimeAxis}
              minInterval={calculateMinInterval(deps.data.datatableUtilities, config)}
              interactive={handlers.isInteractive()}
              onClickValue={onClickValue}
              onSelectRange={onSelectRange}
              renderMode={handlers.getRenderMode()}
              syncColors={handlers.isSyncColorsEnabled()}
              syncTooltips={handlers.isSyncTooltipsEnabled()}
              renderComplete={renderComplete}
            />
          </div>{' '}
        </I18nProvider>
      </KibanaThemeProvider>,
      domNode
    );
  },
});
