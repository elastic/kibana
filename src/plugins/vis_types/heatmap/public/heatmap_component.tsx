/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo, useCallback, useState } from 'react';
import { uniq } from 'lodash';
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
import type { FieldFormatsStart } from '../../../field_formats/public';
import type { IUiSettingsClient } from '../../../../core/public';
import type { PersistedState } from '../../../visualizations/public';
import { Datatable, IInterpreterRenderHandlers } from '../../../expressions/public';
// import type { FieldFormat } from '../../../field_formats/common';
// import { DEFAULT_PERCENT_DECIMALS } from '../common';
import { HeatmapVisParams } from './types';
import { getTimeZone } from './utils/get_timezone';
import { getStopsFromColorsNumber } from './utils/palette';

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
  visParams: Omit<HeatmapVisParams, 'colorSchema' | 'invertColors'>;
  visData: Datatable;
  uiState: PersistedState;
  fireEvent: IInterpreterRenderHandlers['event'];
  renderComplete: IInterpreterRenderHandlers['done'];
  chartsThemeService: ChartsPluginSetup['theme'];
  palettesRegistry: PaletteRegistry;
  fieldFormats: FieldFormatsStart;
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

  const onRenderChange = useCallback<RenderChangeListener>(
    (isRendered) => {
      if (isRendered) {
        props.renderComplete();
      }
    },
    [props]
  );

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

  const { visData, visParams, fieldFormats } = props;
  // console.dir(visData);
  // console.dir(visParams);

  //   const config = useMemo(
  //     () => getConfig(visParams, chartTheme, dimensions),
  //     [chartTheme, visParams, dimensions]
  //   );

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

  // accessors
  const xAccessorIdx = visParams?.xDimension?.accessor ?? 0;
  const xAccessor = visData.columns[xAccessorIdx].id;
  const valueAccessorIdx = visParams.yDimension[0]?.accessor ?? 0;
  const valueAccessor = visData.columns[valueAccessorIdx].id;
  const yAccessorIdx = visParams.seriesDimension?.[0]?.accessor;
  const yAccessor = yAccessorIdx ? visData.columns[yAccessorIdx].id : 'unifiedY';
  const xAxisFieldName = visData.columns[xAccessorIdx].meta.field;
  const isTimeBasedSwimLane = visData.columns[xAccessorIdx].meta.type === 'date';
  const timeFieldName = isTimeBasedSwimLane ? xAxisFieldName : '';

  let chartData = visData.rows.filter((row) => typeof row[valueAccessor!] === 'number');
  if (!yAccessorIdx) {
    // required for tooltip
    chartData = chartData.map((row) => {
      return {
        ...row,
        unifiedY: '',
      };
    });
  }
  // handles cell click event
  const handleCellClick = useCallback(
    (e: HeatmapElementEvent[]): void => {
      const cell = e[0][0];
      const { x, y } = cell.datum;
      const points = [
        {
          row: visData.rows.findIndex((r) => r[xAccessor] === x),
          column: xAccessorIdx,
          value: x,
        },
        ...(visData.columns[yAccessorIdx]
          ? [
              {
                row: visData.rows.findIndex((r) => r[yAccessor] === y),
                column: yAccessorIdx,
                value: y,
              },
            ]
          : []),
      ];
      const context = {
        data: points.map((point) => ({
          row: point.row,
          column: point.column,
          value: point.value,
          table: visData,
        })),
        timeFieldName,
      };
      const event = {
        name: 'filterBucket',
        data: context,
      };
      props.fireEvent(event);
    },
    [props, timeFieldName, visData, xAccessor, xAccessorIdx, yAccessor, yAccessorIdx]
  ) as ElementClickListener;

  // handles brushing event
  const onBrushEnd = useCallback(
    (e: HeatmapBrushEvent) => {
      const { x, y } = e;
      // console.log('brush');
      if (isTimeBasedSwimLane) {
        const context = {
          range: x as number[],
          table: visData,
          column: xAccessorIdx,
          timeFieldName,
        };
        const event = {
          name: 'brush',
          data: context,
        };
        props.fireEvent(event);
      } else {
        const points: Array<{ row: number; column: number; value: string | number }> = [];
        if (yAccessorIdx) {
          (y as string[]).forEach((v) => {
            points.push({
              row: visData.rows.findIndex((r) => r[yAccessor] === v),
              column: yAccessorIdx,
              value: v,
            });
          });
        }
        (x as string[]).forEach((v) => {
          points.push({
            row: visData.rows.findIndex((r) => r[xAccessor] === v),
            column: xAccessorIdx,
            value: v,
          });
        });
        const context = {
          data: points.map((point) => ({
            row: point.row,
            column: point.column,
            value: point.value,
            table: visData,
          })),
          timeFieldName,
        };
        const event = {
          name: 'filterBucket',
          data: context,
        };
        props.fireEvent(event);
      }
    },
    [
      isTimeBasedSwimLane,
      props,
      timeFieldName,
      visData,
      xAccessor,
      xAccessorIdx,
      yAccessor,
      yAccessorIdx,
    ]
  );
  const xScaleType =
    isTimeBasedSwimLane && chartData.length > 1 ? ScaleType.Time : ScaleType.Ordinal;

  const tooltip: TooltipProps = {
    type: visParams.addTooltip ? TooltipType.Follow : TooltipType.None,
  };
  const timeZone = getTimeZone(props.uiSettings);

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
        visible: visParams.isCellLabelVisible ?? false,
        minFontSize: 8,
        maxFontSize: 18,
        useGlobalMinFontSize: true,
      },
      border: {
        strokeWidth: 0,
      },
    },
    yAxisLabel: {
      visible: true,
      textColor: chartTheme.axes?.tickLabel?.fill ?? '#6a717d',
      name: yAccessorIdx ? visData.columns[yAccessorIdx].name : '',
      ...(yAccessorIdx
        ? {
            formatter: (v: number | string) =>
              fieldFormats.deserialize(visData.columns[yAccessorIdx].meta.params).convert(v),
          }
        : {}),
    },
    xAxisLabel: {
      visible: Boolean(visParams.xDimension),
      textColor: chartTheme.axes?.tickLabel?.fill ?? `#6a717d`,
      formatter: (v: number | string) =>
        fieldFormats.deserialize(visData.columns[xAccessorIdx].meta.params).convert(v),
      name: visData.columns[xAccessorIdx].name ?? '',
    },
    brushMask: {
      fill: isDarkTheme ? 'rgb(30,31,35,80%)' : 'rgb(247,247,247,50%)',
    },
    brushArea: {
      stroke: isDarkTheme ? 'rgb(255, 255, 255)' : 'rgb(105, 112, 125)',
    },
    timeZone,
  };

  const values = uniq(chartData.map((d) => d[valueAccessor]));
  const sortedValues = values.sort((a, b) => a - b);
  const [min] = sortedValues;
  const max = sortedValues[sortedValues.length - 1];

  const DEFAULT_PERCENT_DECIMALS = 2;
  // formatters
  const metricFieldFormatter = fieldFormats.deserialize(visParams.yDimension[0].format);
  const percentFormatter = fieldFormats.deserialize({
    id: 'percent',
    params: {
      pattern:
        visParams.percentageFormatPattern ?? `0,0.[${'0'.repeat(DEFAULT_PERCENT_DECIMALS)}]%`,
    },
  });

  const valueFormatter = (d: number) => {
    let value = d;
    if (visParams.percentageMode && !visParams.setColorRange) {
      value = value / max;
    }
    return visParams.percentageMode && !visParams.setColorRange
      ? percentFormatter.convert(value)
      : metricFieldFormatter.convert(d);
  };

  interface ColorStopsParams {
    colors: string[];
    stops: number[];
    rangeMax?: number;
    labels?: string[];
  }
  let params = visParams.palette.params as unknown as ColorStopsParams;
  if (!visParams.setColorRange) {
    const stops = getStopsFromColorsNumber(
      Number(visParams.colorsNumber),
      visParams.percentageMode,
      visParams.percentageMode ? percentFormatter : metricFieldFormatter,
      min,
      max
    );
    params = {
      ...stops,
      colors: visParams.palette?.params?.colors,
    } as unknown as ColorStopsParams;
  }

  const endValue = visParams.setColorRange ? params.rangeMax : max + 1;
  const bands = params.stops.map((stop, index) => {
    return {
      start: stop ?? -Infinity,
      end: params.stops[index + 1] ?? endValue,
      color: params.colors[index],
      label: params?.labels && params.labels.length ? params.labels[index] : undefined,
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
          name={visData.columns[valueAccessorIdx].name}
          colorScale={{
            type: 'bands',
            bands,
          }}
          data={chartData}
          xAccessor={xAccessor}
          yAccessor={yAccessor}
          valueAccessor={valueAccessor}
          valueFormatter={valueFormatter}
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
