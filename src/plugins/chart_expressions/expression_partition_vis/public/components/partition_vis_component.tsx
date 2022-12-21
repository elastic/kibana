/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  Chart,
  Datum,
  LayerValue,
  Partition,
  Position,
  Settings,
  TooltipProps,
  TooltipType,
  SeriesIdentifier,
  PartitionElementEvent,
} from '@elastic/charts';
import { useEuiTheme } from '@elastic/eui';
import type { PaletteRegistry } from '@kbn/coloring';
import { LegendToggle, ChartsPluginSetup } from '@kbn/charts-plugin/public';
import {
  DEFAULT_LEGEND_SIZE,
  LegendSizeToPixels,
} from '@kbn/visualizations-plugin/common/constants';
import { PersistedState } from '@kbn/visualizations-plugin/public';
import { getColumnByAccessor } from '@kbn/visualizations-plugin/common/utils';
import {
  Datatable,
  DatatableColumn,
  IInterpreterRenderHandlers,
} from '@kbn/expressions-plugin/public';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import { consolidateMetricColumns } from '../../common/utils';
import { DEFAULT_PERCENT_DECIMALS } from '../../common/constants';
import {
  PartitionVisParams,
  BucketColumns,
  ValueFormats,
  PieContainerDimensions,
} from '../../common/types/expression_renderers';
import {
  LegendColorPickerWrapper,
  LegendColorPickerWrapperContext,
  getLayers,
  getLegendActions,
  canFilter,
  getFilterClickData,
  getFilterEventData,
  getPartitionTheme,
  getColumns,
  getSplitDimensionAccessor,
  isLegendFlat,
  shouldShowLegend,
  generateFormatters,
  getFormatter,
  getPartitionType,
} from '../utils';
import { ChartSplit, SMALL_MULTIPLES_ID } from './chart_split';
import { VisualizationNoResults } from './visualization_noresults';
import {
  partitionVisWrapperStyle,
  partitionVisContainerStyle,
  partitionVisContainerWithToggleStyleFactory,
} from './partition_vis_component.styles';
import { ChartTypes } from '../../common/types';
import { filterOutConfig } from '../utils/filter_out_config';
import { ColumnCellValueActions, FilterEvent, StartDeps } from '../types';

declare global {
  interface Window {
    /**
     * Flag used to enable debugState on elastic charts
     */
    _echDebugStateFlag?: boolean;
  }
}
export interface PartitionVisComponentProps {
  visParams: PartitionVisParams;
  visData: Datatable;
  visType: ChartTypes;
  uiState: PersistedState;
  fireEvent: IInterpreterRenderHandlers['event'];
  renderComplete: IInterpreterRenderHandlers['done'];
  interactive: boolean;
  chartsThemeService: ChartsPluginSetup['theme'];
  palettesRegistry: PaletteRegistry;
  services: Pick<StartDeps, 'data' | 'fieldFormats'>;
  syncColors: boolean;
  columnCellValueActions: ColumnCellValueActions;
}

const PartitionVisComponent = (props: PartitionVisComponentProps) => {
  const {
    columnCellValueActions,
    visData: originalVisData,
    visParams: preVisParams,
    visType,
    services,
    syncColors,
    interactive,
  } = props;
  const visParams = useMemo(() => filterOutConfig(visType, preVisParams), [preVisParams, visType]);
  const chartTheme = props.chartsThemeService.useChartsTheme();
  const chartBaseTheme = props.chartsThemeService.useChartsBaseTheme();

  const {
    table: visData,
    metricAccessor,
    bucketAccessors,
  } = useMemo(
    () =>
      consolidateMetricColumns(
        originalVisData,
        visParams.dimensions.buckets,
        visParams.dimensions.metrics,
        visParams.metricsToLabels
      ),
    [
      originalVisData,
      visParams.dimensions.buckets,
      visParams.dimensions.metrics,
      visParams.metricsToLabels,
    ]
  );

  const { bucketColumns, metricColumn } = useMemo(
    () => getColumns({ metric: metricAccessor, buckets: bucketAccessors }, visData),
    [bucketAccessors, metricAccessor, visData]
  );

  const formatters = useMemo(
    () => generateFormatters(visData, services.fieldFormats.deserialize),
    [services.fieldFormats.deserialize, visData]
  );

  const showLegendDefault = useCallback(() => {
    const showLegendDef = shouldShowLegend(visType, visParams.legendDisplay, bucketColumns);
    return props.uiState?.get('vis.legendOpen', showLegendDef) ?? showLegendDef;
  }, [bucketColumns, props.uiState, visParams.legendDisplay, visType]);

  const [showLegend, setShowLegend] = useState<boolean>(() => showLegendDefault());

  const showToggleLegendElement = props.uiState !== undefined;

  const [containerDimensions, setContainerDimensions] = useState<
    undefined | PieContainerDimensions
  >();

  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (parentRef && parentRef.current) {
      const parentHeight = parentRef.current!.getBoundingClientRect().height;
      const parentWidth = parentRef.current!.getBoundingClientRect().width;
      setContainerDimensions({ width: parentWidth, height: parentHeight });
    }
  }, [parentRef]);

  useEffect(() => {
    const legendShow = showLegendDefault();
    setShowLegend(legendShow);
  }, [showLegendDefault]);

  const onRenderChange = useCallback(
    (isRendered: boolean = true) => {
      if (isRendered) {
        props.renderComplete();
      }
    },
    [props]
  );

  // handles slice click event
  const handleSliceClick = useCallback(
    (
      clickedLayers: LayerValue[],
      buckets: Array<Partial<BucketColumns>>,
      vData: Datatable,
      splitChartDimension?: DatatableColumn,
      splitChartFormatter?: FieldFormat
    ): void => {
      const data = getFilterClickData(
        clickedLayers,
        buckets,
        metricColumn.id,
        vData,
        originalVisData,
        visParams.dimensions.metrics.length,
        splitChartDimension,
        splitChartFormatter
      );
      props.fireEvent({ name: 'filter', data: { data } });
    },
    [metricColumn.id, originalVisData, props, visParams.dimensions.metrics.length]
  );

  // handles legend action event data
  const getLegendActionEventData = useCallback(
    (vData: Datatable) =>
      (series: SeriesIdentifier): FilterEvent => {
        const data = getFilterEventData(vData, series);

        return {
          name: 'filter',
          data: {
            negate: false,
            data,
          },
        };
      },
    []
  );

  const handleLegendAction = useCallback(
    (event: FilterEvent, negate = false) => {
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

  const toggleLegend = useCallback(() => {
    setShowLegend((value) => {
      const newValue = !value;
      props.uiState?.set('vis.legendOpen', newValue);
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
      props.uiState?.setSilent('vis.colors', null);
      props.uiState?.set('vis.colors', colors);
      props.uiState?.emit('reload');
    },
    [props.uiState]
  );

  const getSliceValue = useCallback((d: Datum, metric: DatatableColumn) => {
    const value = d[metric.id];
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }, []);

  const defaultFormatter = services.fieldFormats.deserialize;
  // formatters
  const metricFieldFormatter = getFormatter(metricColumn, formatters, defaultFormatter);
  const { splitColumn, splitRow } = visParams.dimensions;

  const splitChartFormatter = splitColumn
    ? getFormatter(
        typeof splitColumn[0] === 'string'
          ? getColumnByAccessor(splitColumn[0], visData.columns)!
          : splitColumn[0],
        formatters,
        defaultFormatter
      )
    : splitRow
    ? getFormatter(
        typeof splitRow[0] === 'string'
          ? getColumnByAccessor(splitRow[0], visData.columns)!
          : splitRow[0],
        formatters,
        defaultFormatter
      )
    : undefined;

  const percentFormatter = services.fieldFormats.deserialize({
    id: 'percent',
    params: {
      pattern: `0,0.[${'0'.repeat(visParams.labels.percentDecimals ?? DEFAULT_PERCENT_DECIMALS)}]%`,
    },
  });

  const isDarkMode = props.chartsThemeService.useDarkMode();
  const layers = useMemo(
    () =>
      getLayers(
        visType,
        bucketColumns,
        visParams,
        visData,
        { ...props.uiState?.get('vis.colors', {}), ...props.visParams.labels.colorOverrides },
        visData.rows,
        props.palettesRegistry,
        formatters,
        services.fieldFormats,
        syncColors,
        isDarkMode
      ),
    [
      visType,
      bucketColumns,
      visParams,
      visData,
      props.uiState,
      props.visParams.labels.colorOverrides,
      props.palettesRegistry,
      formatters,
      services.fieldFormats,
      syncColors,
      isDarkMode,
    ]
  );

  const legendActions = useMemo(
    () =>
      interactive
        ? getLegendActions(
            canFilter,
            getLegendActionEventData(visData),
            handleLegendAction,
            columnCellValueActions,
            visParams,
            visData,
            services.data.actions,
            services.fieldFormats
          )
        : undefined,
    [
      columnCellValueActions,
      getLegendActionEventData,
      handleLegendAction,
      interactive,
      services.data.actions,
      services.fieldFormats,
      visData,
      visParams,
    ]
  );

  const rescaleFactor = useMemo(() => {
    const overallSum = visData.rows.reduce((sum, row) => sum + row[metricColumn.id], 0);
    const slices = visData.rows.map((row) => row[metricColumn.id] / overallSum);
    const smallSlices = slices.filter((value) => value < 0.02) ?? [];
    if (smallSlices.length) {
      // shrink up to 20% to give some room for the linked values
      return 1 / (1 + Math.min(smallSlices.length * 0.05, 0.2));
    }
    return 1;
  }, [visData.rows, metricColumn]);

  const themeOverrides = useMemo(
    () => getPartitionTheme(visType, visParams, chartTheme, containerDimensions, rescaleFactor),
    [visType, visParams, chartTheme, containerDimensions, rescaleFactor]
  );

  const fixedViewPort = document.getElementById('app-fixed-viewport');
  const tooltip: TooltipProps = {
    ...(fixedViewPort ? { boundary: fixedViewPort } : {}),
    type: visParams.addTooltip ? TooltipType.Follow : TooltipType.None,
  };
  const legendPosition = visParams.legendPosition ?? Position.Right;

  const splitChartColumnAccessor = splitColumn
    ? getSplitDimensionAccessor(visData.columns, splitColumn[0], formatters, defaultFormatter)
    : undefined;

  const splitChartRowAccessor = splitRow
    ? getSplitDimensionAccessor(visData.columns, splitRow[0], formatters, defaultFormatter)
    : undefined;

  const splitChartDimension = splitColumn
    ? getColumnByAccessor(splitColumn[0], visData.columns)
    : splitRow
    ? getColumnByAccessor(splitRow[0], visData.columns)
    : undefined;

  /**
   * Checks whether data have all zero values.
   * If so, the no data container is loaded.
   */
  const isAllZeros = useMemo(
    () => visData.rows.every((row) => row[metricColumn.id] === 0),
    [visData.rows, metricColumn]
  );

  const isEmpty = visData.rows.length === 0;
  const isMetricEmpty = visData.rows.every((row) => !row[metricColumn.id]);

  /**
   * Checks whether data have negative values.
   * If so, the no data container is loaded.
   */
  const hasNegative = useMemo(
    () =>
      visData.rows.some((row) => {
        const value = row[metricColumn.id];
        return typeof value === 'number' && value < 0;
      }),
    [visData.rows, metricColumn]
  );

  const flatLegend = isLegendFlat(visType, splitChartDimension);

  const canShowPieChart = !isEmpty && !isMetricEmpty && !isAllZeros && !hasNegative;

  const { euiTheme } = useEuiTheme();

  const chartContainerStyle = showToggleLegendElement
    ? partitionVisContainerWithToggleStyleFactory(euiTheme)
    : partitionVisContainerStyle;

  const partitionType = getPartitionType(visType);

  return (
    <div css={chartContainerStyle} data-test-subj="partitionVisChart">
      {!canShowPieChart ? (
        <VisualizationNoResults
          hasNegativeValues={hasNegative}
          chartType={visType}
          renderComplete={onRenderChange}
        />
      ) : (
        <div css={partitionVisWrapperStyle} ref={parentRef}>
          <LegendColorPickerWrapperContext.Provider
            value={{
              legendPosition,
              setColor,
              bucketColumns,
              palette: visParams.palette.name,
              data: visData.rows,
              uiState: props.uiState,
              distinctColors: visParams.distinctColors ?? false,
            }}
          >
            {showToggleLegendElement && (
              <LegendToggle
                onClick={toggleLegend}
                showLegend={showLegend}
                legendPosition={legendPosition}
              />
            )}
            <Chart size="100%">
              <ChartSplit
                splitColumnAccessor={splitChartColumnAccessor}
                splitRowAccessor={splitChartRowAccessor}
              />
              <Settings
                noResults={
                  <VisualizationNoResults chartType={visType} renderComplete={onRenderChange} />
                }
                debugState={window._echDebugStateFlag ?? false}
                showLegend={
                  showLegend ?? shouldShowLegend(visType, visParams.legendDisplay, bucketColumns)
                }
                legendPosition={legendPosition}
                legendSize={LegendSizeToPixels[visParams.legendSize ?? DEFAULT_LEGEND_SIZE]}
                legendMaxDepth={visParams.nestedLegend ? undefined : 1}
                legendColorPicker={props.uiState ? LegendColorPickerWrapper : undefined}
                flatLegend={flatLegend}
                tooltip={tooltip}
                showLegendExtra={visParams.showValuesInLegend}
                onElementClick={([elementEvent]) => {
                  // this cast is safe because we are rendering a partition chart
                  const [layerValues] = elementEvent as PartitionElementEvent;
                  handleSliceClick(
                    layerValues,
                    bucketColumns,
                    visData,
                    splitChartDimension,
                    splitChartFormatter
                  );
                }}
                legendAction={legendActions}
                theme={[
                  // Chart background should be transparent for the usage at Canvas.
                  { background: { color: 'transparent' } },
                  themeOverrides,
                  chartTheme,
                  {
                    legend: {
                      labelOptions: {
                        maxLines: visParams.truncateLegend ? visParams.maxLegendLines ?? 1 : 0,
                      },
                    },
                  },
                ]}
                baseTheme={chartBaseTheme}
                onRenderChange={onRenderChange}
                ariaLabel={props.visParams.ariaLabel}
                ariaUseDefaultSummary={!props.visParams.ariaLabel}
              />
              <Partition
                id={visType}
                smallMultiples={SMALL_MULTIPLES_ID}
                data={visData.rows}
                layout={partitionType}
                specialFirstInnermostSector={visParams.startFromSecondLargestSlice}
                valueAccessor={(d: Datum) => getSliceValue(d, metricColumn)}
                percentFormatter={(d: number) => percentFormatter.convert(d / 100)}
                valueGetter={
                  !visParams.labels.show ||
                  visParams.labels.valuesFormat === ValueFormats.VALUE ||
                  !visParams.labels.values
                    ? undefined
                    : ValueFormats.PERCENT
                }
                valueFormatter={(d: number) =>
                  !visParams.labels.show || !visParams.labels.values
                    ? ''
                    : metricFieldFormatter.convert(d)
                }
                layers={layers}
                topGroove={!visParams.labels.show ? 0 : undefined}
              />
            </Chart>
          </LegendColorPickerWrapperContext.Provider>
        </div>
      )}
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default memo(PartitionVisComponent);
