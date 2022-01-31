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
  PartitionLayout,
} from '@elastic/charts';
import { useEuiTheme } from '@elastic/eui';
import {
  LegendToggle,
  ClickTriggerEvent,
  ChartsPluginSetup,
  PaletteRegistry,
} from '../../../../charts/public';
import type { PersistedState } from '../../../../visualizations/public';
import {
  Datatable,
  DatatableColumn,
  IInterpreterRenderHandlers,
} from '../../../../expressions/public';
import type { FieldFormat } from '../../../../field_formats/common';
import { DEFAULT_PERCENT_DECIMALS } from '../../common/constants';
import {
  PieVisParams,
  BucketColumns,
  ValueFormats,
  PieContainerDimensions,
} from '../../common/types/expression_renderers';
import {
  getColorPicker,
  getLayers,
  getLegendActions,
  canFilter,
  getFilterClickData,
  getFilterEventData,
  getPartitionTheme,
  getColumns,
  getSplitDimensionAccessor,
  getColumnByAccessor,
} from '../utils';
import { ChartSplit, SMALL_MULTIPLES_ID } from './chart_split';
import { VisualizationNoResults } from './visualization_noresults';
import { VisTypePiePluginStartDependencies } from '../plugin';
import { pieChartWrapperStyle, pieChartContainerStyleFactory } from './pie_vis_component.styles';

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
  services: VisTypePiePluginStartDependencies;
  syncColors: boolean;
}

const PieComponent = (props: PieComponentProps) => {
  const theme = useEuiTheme();
  const chartTheme = props.chartsThemeService.useChartsTheme();
  const chartBaseTheme = props.chartsThemeService.useChartsBaseTheme();
  const [showLegend, setShowLegend] = useState<boolean>(() => {
    const bwcLegendStateDefault =
      props.visParams.addLegend == null ? false : props.visParams.addLegend;
    return props.uiState?.get('vis.legendOpen', bwcLegendStateDefault) ?? bwcLegendStateDefault;
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

  const rescaleFactor = useMemo(() => {
    const overallSum = visData.rows.reduce((sum, row) => sum + row[metricColumn.id], 0);
    const slices = visData.rows.map((row) => row[metricColumn.id] / overallSum);
    const smallSlices = slices.filter((value) => value < 0.02).length;
    if (smallSlices) {
      // shrink up to 20% to give some room for the linked values
      return 1 / (1 + Math.min(smallSlices * 0.05, 0.2));
    }
    return 1;
  }, [visData.rows, metricColumn]);

  const themeOverrides = useMemo(
    () => getPartitionTheme(visParams, chartTheme, dimensions, rescaleFactor),
    [chartTheme, visParams, dimensions, rescaleFactor]
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
    ? getColumnByAccessor(visParams.dimensions.splitColumn[0].accessor, visData.columns)
    : visParams.dimensions.splitRow
    ? getColumnByAccessor(visParams.dimensions.splitRow[0].accessor, visData.columns)
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
    <div css={pieChartContainerStyleFactory(theme.euiTheme)} data-test-subj="visTypePieChart">
      {!canShowPieChart ? (
        <VisualizationNoResults hasNegativeValues={hasNegative} />
      ) : (
        <div css={pieChartWrapperStyle} ref={parentRef}>
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
              legendColorPicker={props.uiState ? legendColorPicker : undefined}
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
                services.data.actions,
                services.fieldFormats
              )}
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
            />
            <Partition
              id="pie"
              smallMultiples={SMALL_MULTIPLES_ID}
              data={visData.rows}
              layout={PartitionLayout.sunburst}
              specialFirstInnermostSector={false}
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
