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
import { METRIC_TYPE } from '@kbn/analytics';
import type { PaletteRegistry } from '@kbn/coloring';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import { ExpressionRenderDefinition } from '@kbn/expressions-plugin';
import { FormatFactory } from '@kbn/field-formats-plugin/common';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { isDataLayer } from '../../common/utils/layer_types_guards';
import { LayerTypes, SeriesTypes } from '../../common/constants';
import type { CommonXYLayerConfig, XYChartProps } from '../../common';
import type { BrushEvent, FilterEvent } from '../types';
import { extractOriginatingApp } from '../../../common';

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
  usageCollection?: UsageCollectionStart;
}>;

interface XyChartRendererDeps {
  getStartDeps: GetStartDepsFn;
}

const extractCounterEvents = (originatingApp: string, layers: CommonXYLayerConfig[]) => {
  const dataLayer = layers.find(isDataLayer);
  if (dataLayer) {
    const type =
      dataLayer.seriesType === SeriesTypes.BAR
        ? `${dataLayer.isHorizontal ? 'horizontal_bar' : 'vertical_bar'}`
        : dataLayer.seriesType;

    const isPercentageOrStacked = [
      dataLayer.isPercentage ? 'percentage' : undefined,
      dataLayer.isStacked ? 'stacked' : undefined,
    ].filter(Boolean);

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

    return [
      type,
      isPercentageOrStacked.length ? `${type}_${isPercentageOrStacked.join('_')}` : undefined,
      byTypes[LayerTypes.REFERENCELINE] ? 'reference_layer' : undefined,
      byTypes[LayerTypes.ANNOTATIONS] ? 'annotation_layer' : undefined,
      byTypes[LayerTypes.DATA] > 1 ? 'multiple_data_layers' : undefined,
    ]
      .filter(Boolean)
      .map((item) => `render_${originatingApp}_${item}`);
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
    const deps = await getStartDeps();

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
    const onClickValue = (data: FilterEvent['data']) => {
      handlers.event({ name: 'filter', data });
    };
    const onSelectRange = (data: BrushEvent['data']) => {
      handlers.event({ name: 'brush', data });
    };

    const renderComplete = () => {
      const originatingApp = extractOriginatingApp(handlers.getExecutionContext());

      if (deps.usageCollection && originatingApp) {
        const uiEvents = extractCounterEvents(originatingApp, config.args.layers);
        if (uiEvents) {
          deps.usageCollection.reportUiCounter(originatingApp, METRIC_TYPE.COUNT, uiEvents);
        }
      }

      handlers.done();
    };

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
