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
  RenderChangeListener,
  TooltipProps,
  TooltipType,
  SeriesIdentifier,
} from '@elastic/charts';
import {
  LegendToggle,
  ClickTriggerEvent,
  ChartsPluginSetup,
  PaletteRegistry,
} from '../../../charts/public';
import { DataPublicPluginStart } from '../../../data/public';
import type { PersistedState } from '../../../visualizations/public';
import {
  Datatable,
  DatatableColumn,
  IInterpreterRenderHandlers,
} from '../../../expressions/public';
import type { FieldFormat } from '../../../field_formats/common';
import { DEFAULT_PERCENT_DECIMALS } from '../common';
import { PieVisParams, BucketColumns, ValueFormats, PieContainerDimensions } from './types';
import {
  getColorPicker,
  getLayers,
  getLegendActions,
  canFilter,
  getFilterClickData,
  getFilterEventData,
  getConfig,
  getColumns,
  getSplitDimensionAccessor,
} from './utils';
import { ChartSplit, SMALL_MULTIPLES_ID } from './components/chart_split';
import { VisualizationNoResults } from './components/visualization_noresults';

import './chart.scss';

declare global {
  interface Window {
    /**
     * Flag used to enable debugState on elastic charts
     */
    _echDebugStateFlag?: boolean;
  }
}

export interface PieComponentProps {
  visParams: PieVisParams;
  visData: Datatable;
  uiState: PersistedState;
  fireEvent: IInterpreterRenderHandlers['event'];
  renderComplete: IInterpreterRenderHandlers['done'];
  chartsThemeService: ChartsPluginSetup['theme'];
  palettesRegistry: PaletteRegistry;
  services: DataPublicPluginStart;
  syncColors: boolean;
}

const PieComponent = (props: PieComponentProps) => {
  const chartTheme = props.chartsThemeService.useChartsTheme();
  const chartBaseTheme = props.chartsThemeService.useChartsBaseTheme();
  const [showLegend, setShowLegend] = useState<boolean>(() => {
    const bwcLegendStateDefault =
      props.visParams.addLegend == null ? false : props.visParams.addLegend;
    return props.uiState?.get('vis.legendOpen', bwcLegendStateDefault) as boolean;
  });
  const [dimensions, setDimensions] = useState<undefined | PieContainerDimensions>();

  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (parentRef && parentRef.current) {
      const parentHeight = parentRef.current!.getBoundingClientRect().height;
      const parentWidth = parentRef.current!.getBoundingClientRect().width;
      setDimensions({ width: parentWidth, height: parentHeight });
    }
  }, [parentRef]);

  const onRenderChange = useCallback<RenderChangeListener>(
    (isRendered) => {
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
      bucketColumns: Array<Partial<BucketColumns>>,
      visData: Datatable,
      splitChartDimension?: DatatableColumn,
      splitChartFormatter?: FieldFormat
    ): void => {
      const data = getFilterClickData(
        clickedLayers,
        bucketColumns,
        visData,
        splitChartDimension,
        splitChartFormatter
      );
      const event = {
        name: 'filterBucket',
        data: { data },
      };
      props.fireEvent(event);
    },
    [props]
  );

  // handles legend action event data
  const getLegendActionEventData = useCallback(
    (visData: Datatable) =>
      (series: SeriesIdentifier): ClickTriggerEvent | null => {
        const data = getFilterEventData(visData, series);

        return {
          name: 'filterBucket',
          data: {
            negate: false,
            data,
          },
        };
      },
    []
  );

  const handleLegendAction = useCallback(
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

  const toggleLegend = useCallback(() => {
    setShowLegend((value) => {
      const newValue = !value;
      props.uiState?.set('vis.legendOpen', newValue);
      return newValue;
    });
  }, [props.uiState]);

  useEffect(() => {
    setShowLegend(props.visParams.addLegend);
    props.uiState?.set('vis.legendOpen', props.visParams.addLegend);
  }, [props.uiState, props.visParams.addLegend]);

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

  const { visData, visParams, services, syncColors } = props;

  function getSliceValue(d: Datum, metricColumn: DatatableColumn) {
    const value = d[metricColumn.id];
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  // formatters
  const metricFieldFormatter = services.fieldFormats.deserialize(
    visParams.dimensions.metric.format
  );
  const splitChartFormatter = visParams.dimensions.splitColumn
    ? services.fieldFormats.deserialize(visParams.dimensions.splitColumn[0].format)
    : visParams.dimensions.splitRow
    ? services.fieldFormats.deserialize(visParams.dimensions.splitRow[0].format)
    : undefined;
  const percentFormatter = services.fieldFormats.deserialize({
    id: 'percent',
    params: {
      pattern: `0,0.[${'0'.repeat(visParams.labels.percentDecimals ?? DEFAULT_PERCENT_DECIMALS)}]%`,
    },
  });

  const { bucketColumns, metricColumn } = useMemo(
    () => getColumns(visParams, visData),
    [visData, visParams]
  );

  const layers = useMemo(
    () =>
      getLayers(
        bucketColumns,
        visParams,
        props.uiState?.get('vis.colors', {}),
        visData.rows,
        props.palettesRegistry,
        services.fieldFormats,
        syncColors
      ),
    [
      bucketColumns,
      visParams,
      props.uiState,
      props.palettesRegistry,
      visData.rows,
      services.fieldFormats,
      syncColors,
    ]
  );
  const config = useMemo(
    () => getConfig(visParams, chartTheme, dimensions),
    [chartTheme, visParams, dimensions]
  );
  const tooltip: TooltipProps = {
    type: visParams.addTooltip ? TooltipType.Follow : TooltipType.None,
  };
  const legendPosition = visParams.legendPosition ?? Position.Right;

  const legendColorPicker = useMemo(
    () =>
      getColorPicker(
        legendPosition,
        setColor,
        bucketColumns,
        visParams.palette.name,
        visData.rows,
        props.uiState,
        visParams.distinctColors
      ),
    [
      legendPosition,
      setColor,
      bucketColumns,
      visParams.palette.name,
      visParams.distinctColors,
      visData.rows,
      props.uiState,
    ]
  );

  const splitChartColumnAccessor = visParams.dimensions.splitColumn
    ? getSplitDimensionAccessor(
        services.fieldFormats,
        visData.columns
      )(visParams.dimensions.splitColumn[0])
    : undefined;
  const splitChartRowAccessor = visParams.dimensions.splitRow
    ? getSplitDimensionAccessor(
        services.fieldFormats,
        visData.columns
      )(visParams.dimensions.splitRow[0])
    : undefined;

  const splitChartDimension = visParams.dimensions.splitColumn
    ? visData.columns[visParams.dimensions.splitColumn[0].accessor]
    : visParams.dimensions.splitRow
    ? visData.columns[visParams.dimensions.splitRow[0].accessor]
    : undefined;

  /**
   * Checks whether data have all zero values.
   * If so, the no data container is loaded.
   */
  const isAllZeros = useMemo(
    () => visData.rows.every((row) => row[metricColumn.id] === 0),
    [visData.rows, metricColumn]
  );

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

  const canShowPieChart = !isAllZeros && !hasNegative;

  return (
    <div className="pieChart__container" data-test-subj="visTypePieChart">
      {!canShowPieChart ? (
        <VisualizationNoResults hasNegativeValues={hasNegative} />
      ) : (
        <div className="pieChart__wrapper" ref={parentRef}>
          <LegendToggle
            onClick={toggleLegend}
            showLegend={showLegend}
            legendPosition={legendPosition}
          />
          <Chart size="100%">
            <ChartSplit
              splitColumnAccessor={splitChartColumnAccessor}
              splitRowAccessor={splitChartRowAccessor}
              splitDimension={splitChartDimension}
            />
            <Settings
              debugState={window._echDebugStateFlag ?? false}
              showLegend={showLegend}
              legendPosition={legendPosition}
              legendMaxDepth={visParams.nestedLegend ? undefined : 1}
              legendColorPicker={legendColorPicker}
              flatLegend={Boolean(splitChartDimension)}
              tooltip={tooltip}
              onElementClick={(args) => {
                handleSliceClick(
                  args[0][0] as LayerValue[],
                  bucketColumns,
                  visData,
                  splitChartDimension,
                  splitChartFormatter
                );
              }}
              legendAction={getLegendActions(
                canFilter,
                getLegendActionEventData(visData),
                handleLegendAction,
                visParams,
                services.actions,
                services.fieldFormats
              )}
              theme={[
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
            />
            <Partition
              id="pie"
              smallMultiples={SMALL_MULTIPLES_ID}
              data={visData.rows}
              valueAccessor={(d: Datum) => getSliceValue(d, metricColumn)}
              percentFormatter={(d: number) => percentFormatter.convert(d / 100)}
              valueGetter={
                !visParams.labels.show ||
                visParams.labels.valuesFormat === ValueFormats.VALUE ||
                !visParams.labels.values
                  ? undefined
                  : 'percent'
              }
              valueFormatter={(d: number) =>
                !visParams.labels.show || !visParams.labels.values
                  ? ''
                  : metricFieldFormatter.convert(d)
              }
              layers={layers}
              config={config}
              topGroove={!visParams.labels.show ? 0 : undefined}
            />
          </Chart>
        </div>
      )}
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default memo(PieComponent);
