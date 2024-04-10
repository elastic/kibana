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
import { css } from '@emotion/react';
import React from 'react';
import ReactDOM from 'react-dom';
import { METRIC_TYPE } from '@kbn/analytics';
import type { PaletteRegistry } from '@kbn/coloring';
import { PersistedState } from '@kbn/visualizations-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import type {
  ExpressionRenderDefinition,
  IInterpreterRenderHandlers,
} from '@kbn/expressions-plugin/common';
import { FormatFactory } from '@kbn/field-formats-plugin/common';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { getColumnByAccessor } from '@kbn/visualizations-plugin/common/utils';
import {
  type ChartSizeEvent,
  type ChartSizeSpec,
  extractContainerType,
  extractVisualizationType,
} from '@kbn/chart-expressions-common';

import type { getDataLayers } from '../helpers';
import { LayerTypes, SeriesTypes } from '../../common/constants';
import type { CommonXYDataLayerConfig, XYChartProps } from '../../common';
import type {
  BrushEvent,
  FilterEvent,
  GetCompatibleCellValueActions,
  MultiFilterEvent,
} from '../types';

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
  timeFormat: string;
}>;

interface XyChartRendererDeps {
  getStartDeps: GetStartDepsFn;
}

const extractCounterEvents = (
  originatingApp: string,
  { layers, yAxisConfigs }: XYChartProps['args'],
  canNavigateToLens: boolean,
  services: {
    getDataLayers: typeof getDataLayers;
  }
) => {
  const dataLayers = services.getDataLayers(layers);

  if (dataLayers.length) {
    const [dataLayer] = dataLayers;
    const type =
      dataLayer.seriesType === SeriesTypes.BAR
        ? `${dataLayer.isHorizontal ? 'horizontal_bar' : 'vertical_bar'}`
        : dataLayer.seriesType;

    const byTypes = layers.reduce(
      (acc, item) => {
        if (
          !acc.mixedXY &&
          item.layerType === LayerTypes.DATA &&
          item.seriesType !== dataLayer.seriesType
        ) {
          acc.mixedXY = true;
        }

        acc[item.layerType] += 1;
        return acc;
      },
      {
        mixedXY: false,
        [LayerTypes.REFERENCELINE]: 0,
        [LayerTypes.ANNOTATIONS]: 0,
        [LayerTypes.DATA]: 0,
      }
    );

    // Multiple axes configured on the same side of the chart
    const multiAxisSide = Object.values(
      (yAxisConfigs ?? []).reduce<Record<string, number>>((acc, item) => {
        if (item.position) {
          acc[item.position] = (acc[item.position] ?? 0) + 1;
        }
        return acc;
      }, {})
    ).find((i) => i > 1);

    const multiSplitNonTerms = (dataLayer.splitAccessors ?? [])
      .map((splitAccessor) =>
        getColumnByAccessor(
          splitAccessor,
          dataLayer.table.columns
        )?.meta?.sourceParams?.type?.toString()
      )
      .filter(Boolean);

    const aggregateLayers: string[] = dataLayers
      .map((l) =>
        l.accessors.reduce<string[]>((acc, accessor) => {
          const metricType = getColumnByAccessor(
            accessor,
            l.table.columns
          )?.meta?.sourceParams?.type?.toString();

          if (
            metricType &&
            ['avg_bucket', 'min_bucket', 'max_bucket', 'sum_bucket'].includes(metricType)
          ) {
            acc.push(metricType);
          }
          return acc;
        }, [])
      )
      .flat();

    return [
      [
        type,
        dataLayer.isPercentage ? 'percentage' : undefined,
        dataLayer.isStacked ? 'stacked' : undefined,
        // There's a metric configured for the dot size in an area or line chart
      ]
        .filter(Boolean)
        .join('_'),
      byTypes[LayerTypes.REFERENCELINE] ? 'reference_layer' : undefined,
      byTypes[LayerTypes.ANNOTATIONS] ? 'annotation_layer' : undefined,
      byTypes[LayerTypes.DATA] > 1 ? 'multiple_data_layers' : undefined,
      byTypes.mixedXY ? 'mixed_xy' : undefined,
      dataLayer.markSizeAccessor ? 'metric_dot_size' : undefined,
      multiAxisSide ? 'multi_axis_same_side' : undefined,
      // There are multiple "split series" aggs in an xy chart and they are not all terms but other aggs
      multiSplitNonTerms.length > 1 && !multiSplitNonTerms.every((i) => i === 'terms')
        ? 'multi_split_non_terms'
        : undefined,
      // Multiple average/min/max/sum bucket aggs in a single vis or
      // one average/min/max/sum bucket aggs on an xy chart with at least one "split series" defined
      aggregateLayers.length > 1 ||
      (aggregateLayers.length === 1 && dataLayer.splitAccessors?.length)
        ? 'aggregate_bucket'
        : undefined,
      canNavigateToLens ? `render_${byTypes.mixedXY ? 'mixed_xy' : type}_convertable` : undefined,
    ]
      .filter(Boolean)
      .map((item) => `render_${originatingApp}_${item}`);
  }
};

/**
 * Retrieves the compatible CELL_VALUE_TRIGGER actions indexed by layer
 **/
const getLayerCellValueActions = async (
  layers: CommonXYDataLayerConfig[],
  getCompatibleCellValueActions?: IInterpreterRenderHandlers['getCompatibleCellValueActions']
) => {
  if (!layers || !getCompatibleCellValueActions) {
    return [];
  }
  return await Promise.all(
    layers.map((layer) => {
      const data =
        layer.splitAccessors?.map((accessor) => {
          const column = layer.table.columns.find(({ id }) => id === accessor);
          return { columnMeta: column?.meta };
        }) ?? [];
      return (getCompatibleCellValueActions as GetCompatibleCellValueActions)(data);
    })
  );
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

    // Lazy loaded parts
    const [{ XYChartReportable }, { calculateMinInterval, getDataLayers }] = await Promise.all([
      import('../components/xy_chart'),
      import('../helpers'),
    ]);

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
    const onClickValue = (data: FilterEvent['data']) => {
      handlers.event({ name: 'filter', data });
    };
    const onSelectRange = (data: BrushEvent['data']) => {
      handlers.event({ name: 'brush', data });
    };
    const onClickMultiValue = (data: MultiFilterEvent['data']) => {
      handlers.event({ name: 'multiFilter', data });
    };
    const setChartSize = (data: ChartSizeSpec) => {
      const event: ChartSizeEvent = { name: 'chartSize', data };
      handlers.event(event);
    };

    const layerCellValueActions = await getLayerCellValueActions(
      getDataLayers(config.args.layers),
      handlers.getCompatibleCellValueActions as GetCompatibleCellValueActions | undefined
    );

    const renderComplete = () => {
      const executionContext = handlers.getExecutionContext();
      const containerType = extractContainerType(executionContext);
      const visualizationType = extractVisualizationType(executionContext);

      if (deps.usageCollection && containerType && visualizationType) {
        const uiEvents = extractCounterEvents(
          visualizationType,
          config.args,
          Boolean(config.canNavigateToLens),
          {
            getDataLayers,
          }
        );

        if (uiEvents) {
          deps.usageCollection.reportUiCounter(containerType, METRIC_TYPE.COUNT, uiEvents);
        }
      }

      handlers.done();
    };

    const chartContainerStyle = css({
      position: 'relative',
      width: '100%',
      height: '100%',
    });

    ReactDOM.render(
      <KibanaThemeProvider theme$={deps.kibanaTheme.theme$}>
        <I18nProvider>
          <div css={chartContainerStyle} data-test-subj="xyVisChart">
            <XYChartReportable
              {...config}
              data={deps.data}
              formatFactory={deps.formatFactory}
              chartsActiveCursorService={deps.activeCursor}
              chartsThemeService={deps.theme}
              paletteService={deps.paletteService}
              timeZone={deps.timeZone}
              timeFormat={deps.timeFormat}
              eventAnnotationService={deps.eventAnnotationService}
              useLegacyTimeAxis={deps.useLegacyTimeAxis}
              minInterval={calculateMinInterval(deps.data.datatableUtilities, config)}
              interactive={handlers.isInteractive()}
              onClickValue={onClickValue}
              onClickMultiValue={onClickMultiValue}
              layerCellValueActions={layerCellValueActions}
              onSelectRange={onSelectRange}
              renderMode={handlers.getRenderMode()}
              syncColors={config.syncColors}
              syncTooltips={config.syncTooltips}
              syncCursor={config.syncCursor}
              uiState={handlers.uiState as PersistedState}
              renderComplete={renderComplete}
              setChartSize={setChartSize}
            />
          </div>
        </I18nProvider>
      </KibanaThemeProvider>,
      domNode
    );
  },
});
