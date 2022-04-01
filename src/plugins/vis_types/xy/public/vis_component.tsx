/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PaletteRegistry } from '@kbn/coloring';
import {
  Chart,
  ElementClickListener,
  XYChartElementEvent,
  Position,
  XYChartSeriesIdentifier,
  BrushEndListener,
  RenderChangeListener,
  ScaleType,
  AccessorFn,
  Accessor,
  XYBrushEvent,
} from '@elastic/charts';

import { compact } from 'lodash';
import {
  getFilterFromChartClickEventFn,
  getFilterFromSeriesFn,
  LegendToggle,
  getBrushFromChartBrushEventFn,
  ClickTriggerEvent,
  useActiveCursor,
} from '../../../charts/public';
import { Datatable, IInterpreterRenderHandlers } from '../../../expressions/public';
import type { PersistedState } from '../../../visualizations/public';
import { VisParams } from './types';
import {
  getAdjustedDomain,
  getXDomain,
  getTimeZone,
  renderAllSeries,
  getSeriesNameFn,
  getLegendActions,
  getColorPicker,
  getXAccessor,
  getAllSeries,
} from './utils';
import { XYAxis, XYEndzones, XYCurrentTime, XYSettings, XYThresholdLine } from './components';
import { getConfig } from './config';
import { getThemeService, getDataActions, getPalettesService, getActiveCursor } from './services';
import { ChartType } from '../common';

import './_chart.scss';
import {
  COMPLEX_SPLIT_ACCESSOR,
  getComplexAccessor,
  getSplitSeriesAccessorFnMap,
} from './utils/accessors';
import { ChartSplitter } from './chart_splitter';

export interface VisComponentProps {
  visParams: VisParams;
  visData: Datatable;
  uiState: PersistedState;
  fireEvent: IInterpreterRenderHandlers['event'];
  renderComplete: IInterpreterRenderHandlers['done'];
  syncColors: boolean;
  useLegacyTimeAxis: boolean;
}

export type VisComponentType = typeof VisComponent;

const VisComponent = (props: VisComponentProps) => {
  const [showLegend, setShowLegend] = useState<boolean>(() => {
    // TODO: Check when this bwc can safely be removed
    const bwcLegendStateDefault =
      props.visParams.addLegend == null ? true : props.visParams.addLegend;
    return props.uiState?.get('vis.legendOpen', bwcLegendStateDefault) as boolean;
  });
  const [palettesRegistry, setPalettesRegistry] = useState<PaletteRegistry | null>(null);
  const chartRef = useRef<Chart>(null);

  const handleCursorUpdate = useActiveCursor(getActiveCursor(), chartRef, {
    datatables: [props.visData],
  });

  const onRenderChange = useCallback<RenderChangeListener>(
    (isRendered) => {
      if (isRendered) {
        props.renderComplete();
      }
    },
    [props]
  );

  useEffect(() => {
    const fetchPalettes = async () => {
      const palettes = await getPalettesService().getPalettes();
      setPalettesRegistry(palettes);
    };
    fetchPalettes();
  }, []);

  const handleFilterClick = useCallback(
    (
      visData: Datatable,
      xAccessor: Accessor | AccessorFn,
      splitSeriesAccessors: Array<Accessor | AccessorFn>,
      splitChartAccessor?: Accessor | AccessorFn
    ): ElementClickListener => {
      const splitSeriesAccessorFnMap = getSplitSeriesAccessorFnMap(splitSeriesAccessors);
      return (elements) => {
        if (xAccessor !== null) {
          const event = getFilterFromChartClickEventFn(
            visData,
            xAccessor,
            splitSeriesAccessorFnMap,
            splitChartAccessor
          )(elements as XYChartElementEvent[]);
          props.fireEvent(event);
        }
      };
    },
    [props]
  );

  const handleBrush = useCallback(
    (
      visData: Datatable,
      xAccessor: Accessor | AccessorFn,
      isInterval: boolean
    ): BrushEndListener | undefined => {
      if (xAccessor !== null && isInterval) {
        return (brushArea) => {
          const event = getBrushFromChartBrushEventFn(
            visData,
            xAccessor
          )(brushArea as XYBrushEvent);
          props.fireEvent(event);
        };
      }
    },
    [props]
  );

  const getFilterEventData = useCallback(
    (
      visData: Datatable,
      xAccessor: Accessor | AccessorFn,
      splitSeriesAccessors: Array<Accessor | AccessorFn>
    ) => {
      const splitSeriesAccessorFnMap = getSplitSeriesAccessorFnMap(splitSeriesAccessors);
      return (series: XYChartSeriesIdentifier): ClickTriggerEvent | null => {
        if (xAccessor !== null) {
          return getFilterFromSeriesFn(visData)(series, splitSeriesAccessorFnMap);
        }

        return null;
      };
    },
    []
  );

  const handleFilterAction = useCallback(
    (event: ClickTriggerEvent, negate = false) => {
      props.fireEvent({
        ...event,
        data: {
          ...event.data,
          negate,
        },
      });
    },
    [props]
  );

  const canFilter = async (event: ClickTriggerEvent | null): Promise<boolean> => {
    if (!event) {
      return false;
    }
    const filters = await getDataActions().createFiltersFromValueClickAction(event.data);
    return Boolean(filters.length);
  };

  const toggleLegend = useCallback(() => {
    setShowLegend((value) => {
      const newValue = !value;
      if (props.uiState?.set) {
        props.uiState.set('vis.legendOpen', newValue);
      }
      return newValue;
    });
  }, [props.uiState]);

  const setColor = useCallback(
    (newColor: string | null, seriesLabel: string | number) => {
      const colors = props.uiState?.get('vis.colors') || {};
      if (colors[seriesLabel] === newColor || !newColor) {
        delete colors[seriesLabel];
      } else {
        colors[seriesLabel] = newColor;
      }

      if (props.uiState?.set) {
        props.uiState.setSilent('vis.colors', null);
        props.uiState.set('vis.colors', colors);
        props.uiState.emit('colorChanged');
      }
    },
    [props.uiState]
  );

  const { visData, visParams, syncColors } = props;
  const isDarkMode = getThemeService().useDarkMode();

  const config = getConfig(visData, visParams, props.useLegacyTimeAxis, isDarkMode);
  const timeZone = getTimeZone();
  const xDomain =
    config.xAxis.scale.type === ScaleType.Ordinal ? undefined : getXDomain(config.aspects.x.params);
  const hasBars = visParams.seriesParams.some(
    ({ type, data: { id: paramId } }) =>
      type === ChartType.Histogram &&
      config.aspects.y.find(({ aggId }) => aggId === paramId) !== undefined
  );
  const adjustedXDomain =
    config.xAxis.scale.type === ScaleType.Ordinal
      ? undefined
      : getAdjustedDomain(visData.rows, config.aspects.x, timeZone, xDomain, hasBars);
  const legendPosition = useMemo(
    () => config.legend.position ?? Position.Right,
    [config.legend.position]
  );

  const getSeriesName = getSeriesNameFn(config.aspects, config.aspects.y.length > 1);

  const splitAccessors = config.aspects.series?.map(({ accessor, formatter }) => {
    return { accessor, formatter };
  });

  const allSeries = useMemo(
    () => getAllSeries(visData.rows, splitAccessors, config.aspects.y),
    [config.aspects.y, splitAccessors, visData.rows]
  );

  const getSeriesColor = useCallback(
    (series: XYChartSeriesIdentifier) => {
      const seriesName = getSeriesName(series) as string;
      if (!seriesName) {
        return null;
      }
      const overwriteColors: Record<string, string> = props.uiState?.get
        ? props.uiState.get('vis.colors', {})
        : {};

      if (Object.keys(overwriteColors).includes(seriesName)) {
        return overwriteColors[seriesName];
      }
      const outputColor = palettesRegistry?.get(visParams.palette.name).getCategoricalColor(
        [
          {
            name: seriesName,
            rankAtDepth: splitAccessors
              ? allSeries.findIndex((name) => name === seriesName)
              : config.aspects.y.findIndex((aspect) => aspect.accessor === series.yAccessor),
            totalSeriesAtDepth: splitAccessors ? allSeries.length : config.aspects.y.length,
          },
        ],
        {
          maxDepth: 1,
          totalSeries: splitAccessors ? allSeries.length : config.aspects.y.length,
          behindText: false,
          syncColors,
        }
      );
      return outputColor || null;
    },
    [
      allSeries,
      config.aspects.y,
      getSeriesName,
      props.uiState,
      splitAccessors,
      syncColors,
      visParams.palette.name,
      palettesRegistry,
    ]
  );
  const xAccessor = getXAccessor(config.aspects.x);

  const splitSeriesAccessors = useMemo(
    () =>
      config.aspects.series
        ? compact(config.aspects.series.map(getComplexAccessor(COMPLEX_SPLIT_ACCESSOR)))
        : [],
    [config.aspects.series]
  );
  const splitChartColumnAccessor = config.aspects.splitColumn
    ? getComplexAccessor(COMPLEX_SPLIT_ACCESSOR, true)(config.aspects.splitColumn)
    : undefined;
  const splitChartRowAccessor = config.aspects.splitRow
    ? getComplexAccessor(COMPLEX_SPLIT_ACCESSOR, true)(config.aspects.splitRow)
    : undefined;

  const renderSeries = useMemo(
    () =>
      renderAllSeries(
        config,
        visParams.seriesParams,
        visData.rows,
        getSeriesName,
        getSeriesColor,
        timeZone,
        xAccessor,
        splitSeriesAccessors
      ),
    [
      config,
      getSeriesColor,
      getSeriesName,
      splitSeriesAccessors,
      timeZone,
      visData.rows,
      visParams.seriesParams,
      xAccessor,
    ]
  );

  const legendColorPicker = useMemo(
    () =>
      getColorPicker(
        legendPosition,
        setColor,
        getSeriesName,
        visParams.palette.name,
        props.uiState
      ),
    [getSeriesName, legendPosition, props.uiState, setColor, visParams.palette.name]
  );

  const splitChartDimension = visParams.dimensions.splitColumn
    ? visData.columns[visParams.dimensions.splitColumn[0].accessor]
    : visParams.dimensions.splitRow
    ? visData.columns[visParams.dimensions.splitRow[0].accessor]
    : undefined;

  return (
    <div className="xyChart__container" data-test-subj="visTypeXyChart">
      <LegendToggle
        onClick={toggleLegend}
        showLegend={showLegend}
        legendPosition={legendPosition}
      />
      <Chart size="100%" ref={chartRef}>
        <ChartSplitter
          splitColumnAccessor={splitChartColumnAccessor}
          splitRowAccessor={splitChartRowAccessor}
          splitDimension={splitChartDimension}
        />
        <XYSettings
          {...config}
          truncateLegend={visParams.truncateLegend}
          maxLegendLines={visParams.maxLegendLines}
          showLegend={showLegend}
          onPointerUpdate={handleCursorUpdate}
          legendPosition={legendPosition}
          legendSize={visParams.legendSize}
          xDomain={xDomain}
          adjustedXDomain={adjustedXDomain}
          legendColorPicker={legendColorPicker}
          onElementClick={handleFilterClick(
            visData,
            xAccessor,
            splitSeriesAccessors,
            splitChartColumnAccessor ?? splitChartRowAccessor
          )}
          ariaLabel={visParams.ariaLabel}
          onBrushEnd={handleBrush(visData, xAccessor, 'interval' in config.aspects.x.params)}
          onRenderChange={onRenderChange}
          legendAction={
            config.aspects.series && (config.aspects.series?.length ?? 0) > 0
              ? getLegendActions(
                  canFilter,
                  getFilterEventData(visData, xAccessor, splitSeriesAccessors),
                  handleFilterAction,
                  getSeriesName
                )
              : undefined
          }
        />
        <XYThresholdLine {...config.thresholdLine} />
        <XYCurrentTime enabled={config.showCurrentTime} isDarkMode={isDarkMode} domain={xDomain} />
        <XYEndzones
          isFullBin={!config.enableHistogramMode}
          enabled={config.isTimeChart}
          isDarkMode={isDarkMode}
          domain={xDomain}
          hideTooltips={!config.detailedTooltip}
          adjustedDomain={adjustedXDomain}
        />
        <XYAxis {...config.xAxis} />
        {config.yAxes.map((axisProps) => (
          <XYAxis key={axisProps.id} {...axisProps} />
        ))}
        {renderSeries}
      </Chart>
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default memo(VisComponent);
