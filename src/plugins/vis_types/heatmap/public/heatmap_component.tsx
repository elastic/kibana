/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo, useCallback, useState } from 'react';

import {
  Chart,
  Position,
  Settings,
  RenderChangeListener,
  TooltipProps,
  TooltipType,
  HeatmapElementEvent,
  ElementClickListener,
  BrushEndListener,
  HeatmapBrushEvent,
  Heatmap,
  ScaleType,
  HeatmapSpec,
} from '@elastic/charts';
import { LegendToggle, ChartsPluginSetup, PaletteRegistry } from '../../../charts/public';
import { DataPublicPluginStart } from '../../../data/public';
import type { IUiSettingsClient } from '../../../../core/public';
import type { PersistedState } from '../../../visualizations/public';
import { Datatable, IInterpreterRenderHandlers } from '../../../expressions/public';
// import type { FieldFormat } from '../../../field_formats/common';
// import { DEFAULT_PERCENT_DECIMALS } from '../common';
import { HeatmapVisParams } from './types';
import { getTimeZone } from './utils/get_timezone';
import { getStopsWithColorsFromColorsNumber } from './utils/palette';

import './chart.scss';

declare global {
  interface Window {
    /**
     * Flag used to enable debugState on elastic charts
     */
    _echDebugStateFlag?: boolean;
  }
}

export interface HeatmapComponentProps {
  visParams: HeatmapVisParams;
  visData: Datatable;
  uiState: PersistedState;
  fireEvent: IInterpreterRenderHandlers['event'];
  renderComplete: IInterpreterRenderHandlers['done'];
  chartsThemeService: ChartsPluginSetup['theme'];
  palettesRegistry: PaletteRegistry;
  services: DataPublicPluginStart;
  uiSettings: IUiSettingsClient;
  syncColors: boolean;
}

const HeatmapComponent = (props: HeatmapComponentProps) => {
  const chartTheme = props.chartsThemeService.useChartsTheme();
  const isDarkTheme = props.chartsThemeService.useDarkMode();
  // const chartBaseTheme = props.chartsThemeService.useChartsBaseTheme();
  const [showLegend, setShowLegend] = useState<boolean>(() => {
    // TODO: Check when this bwc can safely be removed
    const bwcLegendStateDefault =
      props.visParams.addLegend == null ? true : props.visParams.addLegend;
    return props.uiState?.get('vis.legendOpen', bwcLegendStateDefault) as boolean;
  });

  // const parentRef = useRef<HTMLDivElement>(null);

  // useEffect(() => {
  //   if (parentRef && parentRef.current) {
  //     const parentHeight = parentRef.current!.getBoundingClientRect().height;
  //     const parentWidth = parentRef.current!.getBoundingClientRect().width;
  //     setDimensions({ width: parentWidth, height: parentHeight });
  //   }
  // }, [parentRef]);

  const onRenderChange = useCallback<RenderChangeListener>(
    (isRendered) => {
      if (isRendered) {
        props.renderComplete();
      }
    },
    [props]
  );

  // handles cell click event
  const handleCellClick = useCallback((e: HeatmapElementEvent[]): void => {
    // const cell = e[0][0];
    // const { x, y } = cell.datum;
    // console.log('bom');
    // const data = getFilterClickData(
    //   clickedLayers,
    //   bucketColumns,
    //   visData,
    //   splitChartDimension,
    //   splitChartFormatter
    // );
    // const event = {
    //   name: 'filterBucket',
    //   data: { data },
    // };
    // props.fireEvent(event);
  }, []) as ElementClickListener;

  const onBrushEnd = useCallback((e: HeatmapBrushEvent) => {
    // const { x, y } = e;
    // console.log('brush');
    // const xAxisFieldName = xAxisColumn.meta.field;
    // const timeFieldName = isTimeBasedSwimLane ? xAxisFieldName : '';
    // if (isTimeBasedSwimLane) {
    //   const context: LensBrushEvent['data'] = {
    //     range: x as number[],
    //     table,
    //     column: xAxisColumnIndex,
    //     timeFieldName,
    //   };
    //   onSelectRange(context);
    // } else {
    //   const points: Array<{ row: number; column: number; value: string | number }> = [];
    //   if (yAxisColumn) {
    //     (y as string[]).forEach((v) => {
    //       points.push({
    //         row: table.rows.findIndex((r) => r[yAxisColumn.id] === v),
    //         column: yAxisColumnIndex,
    //         value: v,
    //       });
    //     });
    //   }
    //   (x as string[]).forEach((v) => {
    //     points.push({
    //       row: table.rows.findIndex((r) => r[xAxisColumn.id] === v),
    //       column: xAxisColumnIndex,
    //       value: v,
    //     });
    //   });
    //   const context: LensFilterEvent['data'] = {
    //     data: points.map((point) => ({
    //       row: point.row,
    //       column: point.column,
    //       value: point.value,
    //       table,
    //     })),
    //     timeFieldName,
    //   };
    //   onClickValue(context);
    // }
  }, []);

  // handles legend action event data
  //   const getLegendActionEventData = useCallback(
  //     (visData: Datatable) =>
  //       (series: SeriesIdentifier): ClickTriggerEvent | null => {
  //         const data = getFilterEventData(visData, series);

  //         return {
  //           name: 'filterBucket',
  //           data: {
  //             negate: false,
  //             data,
  //           },
  //         };
  //       },
  //     []
  //   );

  //   const handleLegendAction = useCallback(
  //     (event: ClickTriggerEvent, negate = false) => {
  //       props.fireEvent({
  //         ...event,
  //         data: {
  //           ...event.data,
  //           negate,
  //         },
  //       });
  //     },
  //     [props]
  //   );

  const toggleLegend = useCallback(() => {
    setShowLegend((value) => {
      const newValue = !value;
      if (props.uiState?.set) {
        props.uiState.set('vis.legendOpen', newValue);
      }
      return newValue;
    });
  }, [props.uiState]);

  //   const setColor = useCallback(
  //     (newColor: string | null, seriesLabel: string | number) => {
  //       const colors = props.uiState?.get('vis.colors') || {};
  //       if (colors[seriesLabel] === newColor || !newColor) {
  //         delete colors[seriesLabel];
  //       } else {
  //         colors[seriesLabel] = newColor;
  //       }
  //       props.uiState?.setSilent('vis.colors', null);
  //       props.uiState?.set('vis.colors', colors);
  //       props.uiState?.emit('reload');
  //     },
  //     [props.uiState]
  //   );

  const { visData, visParams, services } = props;
  // console.dir(visData);
  // console.dir(visParams);

  // formatters
  const metricFieldFormatter = services.fieldFormats.deserialize(visParams.dimensions?.y[0].format);
  //   const splitChartFormatter = visParams.dimensions.splitColumn
  //     ? services.fieldFormats.deserialize(visParams.dimensions.splitColumn[0].format)
  //     : visParams.dimensions.splitRow
  //     ? services.fieldFormats.deserialize(visParams.dimensions.splitRow[0].format)
  //     : undefined;
  //   const percentFormatter = services.fieldFormats.deserialize({
  //     id: 'percent',
  //     params: {
  //       pattern: `0,0.[${'0'.repeat(visParams.labels.percentDecimals ?? DEFAULT_PERCENT_DECIMALS)}]%`,
  //     },
  //   });

  //   const { bucketColumns, metricColumn } = useMemo(
  //     () => getColumns(visParams, visData),
  //     [visData, visParams]
  //   );

  //   const config = useMemo(
  //     () => getConfig(visParams, chartTheme, dimensions),
  //     [chartTheme, visParams, dimensions]
  //   );
  //   const tooltip: TooltipProps = {
  //     type: visParams.addTooltip ? TooltipType.Follow : TooltipType.None,
  //   };
  const legendPosition = visParams.legendPosition ?? Position.Right;

  //   const legendColorPicker = useMemo(
  //     () =>
  //       getColorPicker(
  //         legendPosition,
  //         setColor,
  //         bucketColumns,
  //         visParams.palette.name,
  //         visData.rows,
  //         props.uiState,
  //         visParams.distinctColors
  //       ),
  //     [
  //       legendPosition,
  //       setColor,
  //       bucketColumns,
  //       visParams.palette.name,
  //       visParams.distinctColors,
  //       visData.rows,
  //       props.uiState,
  //     ]
  //   );

  //   const splitChartColumnAccessor = visParams.dimensions.splitColumn
  //     ? getSplitDimensionAccessor(
  //         services.fieldFormats,
  //         visData.columns
  //       )(visParams.dimensions.splitColumn[0])
  //     : undefined;
  //   const splitChartRowAccessor = visParams.dimensions.splitRow
  //     ? getSplitDimensionAccessor(
  //         services.fieldFormats,
  //         visData.columns
  //       )(visParams.dimensions.splitRow[0])
  //     : undefined;

  //   const splitChartDimension = visParams.dimensions.splitColumn
  //     ? visData.columns[visParams.dimensions.splitColumn[0].accessor]
  //     : visParams.dimensions.splitRow
  //     ? visData.columns[visParams.dimensions.splitRow[0].accessor]
  //     : undefined;

  // accessors
  const xAccessorIdx = visParams.dimensions?.x?.accessor ?? 0;
  const xAccessor = visData.columns[xAccessorIdx].id;
  const valueAccessorIdx = visParams.dimensions?.y[0]?.accessor ?? 0;
  const valueAccessor = visData.columns[valueAccessorIdx].id;
  const yAccessorIdx = visParams.dimensions?.series?.[0]?.accessor;
  const yAccessor = yAccessorIdx ? visData.columns[yAccessorIdx].id : 'unifiedY';

  const chartData = visData.rows.filter((row) => typeof row[valueAccessor!] === 'number');
  const isTimeBasedSwimLane = visData.columns[xAccessorIdx].meta.type === 'date';
  const xScaleType =
    isTimeBasedSwimLane && chartData.length > 1 ? ScaleType.Time : ScaleType.Ordinal;

  // const bands = ranges.map((start, index, array) => {
  //   return {
  //     // with the default continuity:above the every range is left-closed
  //     start,
  //     // with the default continuity:above the last range is right-open
  //     end: index === array.length - 1 ? Infinity : array[index + 1],
  //     // the current colors array contains a duplicated color at the beginning that we need to skip
  //     color: colors[index + 1],
  //   };
  // });
  const tooltip: TooltipProps = {
    type: visParams.addTooltip ? TooltipType.Follow : TooltipType.None,
  };
  const timeZone = getTimeZone(props.uiSettings);

  const labels = visParams.valueAxes[0].labels;
  const config: HeatmapSpec['config'] = {
    grid: {
      stroke: {
        width: 1,
        color: '#D3DAE6',
      },
      cellHeight: {
        max: 'fill',
        min: 1,
      },
    },
    cell: {
      maxWidth: 'fill',
      maxHeight: 'fill',
      label: {
        visible: labels.show ?? false,
      },
      border: {
        strokeWidth: 0,
      },
    },
    yAxisLabel: {
      visible: true,
      textColor: chartTheme.axes?.tickLabel?.fill ?? '#6a717d',
      // padding: 0,
      name: visParams.dimensions?.series?.[0]?.label ?? '',
      ...(yAccessorIdx
        ? {
            formatter: (v: number | string) =>
              services.fieldFormats
                .deserialize(visData.columns[yAccessorIdx].meta.params)
                .convert(v),
          }
        : {}),
    },
    xAxisLabel: {
      visible: true,
      // eui color subdued
      textColor: chartTheme.axes?.tickLabel?.fill ?? `#6a717d`,
      formatter: (v: number | string) =>
        services.fieldFormats.deserialize(visData.columns[xAccessorIdx].meta.params).convert(v),
      name: visParams.dimensions?.x?.label ?? '',
    },
    brushMask: {
      fill: isDarkTheme ? 'rgb(30,31,35,80%)' : 'rgb(247,247,247,50%)',
    },
    brushArea: {
      stroke: isDarkTheme ? 'rgb(255, 255, 255)' : 'rgb(105, 112, 125)',
    },
    timeZone,
  };

  // const { percentageMode, palette } = visParams;
  // const { stops = [] } = palette.params ?? {};
  // const min = stops[0];
  // const max = stops[stops.length - 1];

  // const color = palette ? getColor(value, palette.params) : undefined;

  // if (isPercentageMode && stops.length) {
  //   value = (value - min) / (max - min);
  // }
  interface ColorStopsParams {
    colors: string[];
    stops: number[];
  }
  let params: ColorStopsParams;
  if (visParams.setColorRange) {
    params = visParams.palette.params as unknown as ColorStopsParams;
  } else {
    params = getStopsWithColorsFromColorsNumber(
      visData.rows,
      valueAccessor,
      Number(visParams.colorsNumber),
      visParams.colorSchema,
      visParams.invertColors
    );
  }
  const bands = params.stops.map((stop, index) => {
    return {
      start: stop ?? -Infinity,
      end: params.stops[index + 1] ?? Infinity,
      color: params.colors[index],
    };
  });

  return (
    <div className="heatmapChart__container" data-test-subj="visTypeHeatmapChart">
      <LegendToggle
        onClick={toggleLegend}
        showLegend={showLegend}
        legendPosition={legendPosition}
      />
      <Chart size="100%">
        <Settings
          onElementClick={handleCellClick}
          onRenderChange={onRenderChange}
          tooltip={tooltip}
          showLegend={showLegend}
          legendPosition={legendPosition}
          debugState={window._echDebugStateFlag ?? false}
          theme={{
            ...chartTheme,
            // legend: {
            //   labelOptions: {
            //     maxLines: args.legend.shouldTruncate ? args.legend?.maxLines ?? 1 : 0,
            //   },
            // },
          }}
          onBrushEnd={onBrushEnd as BrushEndListener}
        />
        <Heatmap
          id="heatmap"
          name={visParams.dimensions?.y[0]?.label}
          colorScale={{
            type: 'bands',
            bands,
          }}
          data={visData.rows}
          xAccessor={xAccessor}
          yAccessor={yAccessor}
          valueAccessor={valueAccessor}
          valueFormatter={(d: number) => metricFieldFormatter.convert(d)}
          xScaleType={xScaleType}
          ySortPredicate="dataIndex"
          config={config}
          xSortPredicate="dataIndex"
        />
      </Chart>
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default memo(HeatmapComponent);
