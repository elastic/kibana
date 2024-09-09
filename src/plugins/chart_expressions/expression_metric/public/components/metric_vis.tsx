/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { i18n } from '@kbn/i18n';
import {
  Chart,
  Metric,
  MetricSpec,
  MetricWProgress,
  isMetricElementEvent,
  RenderChangeListener,
  Settings,
  MetricWTrend,
  MetricWNumber,
  SettingsProps,
  MetricWText,
} from '@elastic/charts';
import { getColumnByAccessor, getFormatByAccessor } from '@kbn/visualizations-plugin/common/utils';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import type {
  Datatable,
  DatatableColumn,
  DatatableRow,
  IInterpreterRenderHandlers,
} from '@kbn/expressions-plugin/common';
import { CustomPaletteState } from '@kbn/charts-plugin/public';
import {
  FieldFormatConvertFunction,
  SerializedFieldFormat,
} from '@kbn/field-formats-plugin/common';
import { CUSTOM_PALETTE } from '@kbn/coloring';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { useResizeObserver, useEuiScrollBar, EuiIcon } from '@elastic/eui';
import { AllowedChartOverrides, AllowedSettingsOverrides } from '@kbn/charts-plugin/common';
import { type ChartSizeEvent, getOverridesFor } from '@kbn/chart-expressions-common';
import { DEFAULT_TRENDLINE_NAME } from '../../common/constants';
import { VisParams } from '../../common';
import { getPaletteService, getThemeService, getFormatService } from '../services';
import { getDataBoundsForPalette } from '../utils';

export const defaultColor = euiThemeVars.euiColorEmptyShade;

function enhanceFieldFormat(serializedFieldFormat: SerializedFieldFormat | undefined) {
  const formatId = serializedFieldFormat?.id || 'number';
  if (formatId === 'duration' && !serializedFieldFormat?.params?.formatOverride) {
    return {
      ...serializedFieldFormat,
      params: {
        // by default use the compact precise format
        outputFormat: 'humanizePrecise',
        outputPrecision: 1,
        useShortSuffix: true,
        // but if user configured something else, use it
        ...serializedFieldFormat!.params,
      },
    };
  }
  return serializedFieldFormat ?? { id: formatId };
}

const renderSecondaryMetric = (
  columns: DatatableColumn[],
  row: DatatableRow,
  config: Pick<VisParams, 'metric' | 'dimensions'>
) => {
  let secondaryMetricColumn: DatatableColumn | undefined;
  let formatSecondaryMetric: ReturnType<typeof getMetricFormatter>;
  if (config.dimensions.secondaryMetric) {
    secondaryMetricColumn = getColumnByAccessor(config.dimensions.secondaryMetric, columns);
    formatSecondaryMetric = getMetricFormatter(config.dimensions.secondaryMetric, columns);
  }
  const secondaryPrefix = config.metric.secondaryPrefix ?? secondaryMetricColumn?.name;
  return (
    <span>
      {secondaryPrefix}
      {secondaryMetricColumn
        ? `${secondaryPrefix ? ' ' : ''}${formatSecondaryMetric!(row[secondaryMetricColumn.id])}`
        : undefined}
    </span>
  );
};

const getMetricFormatter = (
  accessor: ExpressionValueVisDimension | string,
  columns: Datatable['columns']
) => {
  const serializedFieldFormat = getFormatByAccessor(accessor, columns);
  const enhancedFieldFormat = enhanceFieldFormat(serializedFieldFormat);
  return getFormatService().deserialize(enhancedFieldFormat).getConverterFor('text');
};

const getColor = (
  value: number,
  paletteParams: CustomPaletteState,
  accessors: { metric: string; max?: string; breakdownBy?: string },
  data: Datatable,
  rowNumber: number
) => {
  const { min, max } = getDataBoundsForPalette(accessors, data, rowNumber);

  return getPaletteService().get(CUSTOM_PALETTE)?.getColorForValue?.(value, paletteParams, {
    min,
    max,
  });
};

const buildFilterEvent = (rowIdx: number, columnIdx: number, table: Datatable) => {
  const column = table.columns[columnIdx];
  return {
    name: 'filter',
    data: {
      data: [
        {
          table,
          column: columnIdx,
          row: rowIdx,
          value: table.rows[rowIdx][column.id],
        },
      ],
    },
  };
};

const getIcon =
  (type: string) =>
  ({ width, height, color }: { width: number; height: number; color: string }) =>
    <EuiIcon type={type} width={width} height={height} fill={color} style={{ width, height }} />;

export interface MetricVisComponentProps {
  data: Datatable;
  config: Pick<VisParams, 'metric' | 'dimensions'>;
  renderComplete: IInterpreterRenderHandlers['done'];
  fireEvent: IInterpreterRenderHandlers['event'];
  filterable: boolean;
  overrides?: AllowedSettingsOverrides & AllowedChartOverrides;
}

export const MetricVis = ({
  data,
  config,
  renderComplete,
  fireEvent,
  filterable,
  overrides,
}: MetricVisComponentProps) => {
  const grid = useRef<MetricSpec['data']>([[]]);

  const onRenderChange = useCallback<RenderChangeListener>(
    (isRendered) => {
      if (isRendered) {
        renderComplete();
      }
    },
    [renderComplete]
  );

  const onWillRender = useCallback(() => {
    const maxTileSideLength = grid.current.length * grid.current[0]?.length > 1 ? 200 : 300;
    const event: ChartSizeEvent = {
      name: 'chartSize',
      data: {
        maxDimensions: {
          y: { value: grid.current.length * maxTileSideLength, unit: 'pixels' },
          x: { value: grid.current[0]?.length * maxTileSideLength, unit: 'pixels' },
        },
      },
    };
    fireEvent(event);
  }, [fireEvent, grid]);

  const [scrollChildHeight, setScrollChildHeight] = useState<string>('100%');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollDimensions = useResizeObserver(scrollContainerRef.current);
  const chartBaseTheme = getThemeService().useChartsBaseTheme();

  const primaryMetricColumn = getColumnByAccessor(config.dimensions.metric, data.columns)!;
  const formatPrimaryMetric = getMetricFormatter(config.dimensions.metric, data.columns);

  let breakdownByColumn: DatatableColumn | undefined;
  let formatBreakdownValue: FieldFormatConvertFunction;
  if (config.dimensions.breakdownBy) {
    breakdownByColumn = getColumnByAccessor(config.dimensions.breakdownBy, data.columns);
    formatBreakdownValue = getFormatService()
      .deserialize(getFormatByAccessor(config.dimensions.breakdownBy, data.columns))
      .getConverterFor('text');
  }

  const maxColId = config.dimensions.max
    ? getColumnByAccessor(config.dimensions.max, data.columns)?.id
    : undefined;

  // For a sigle tile configuration, either no breakdown or with a collapse by, provide
  // a fallback in case of missing data. Make sure to provide an exact "null" value to render a N/A metric.
  // For reference, undefined will render as - instead of N/A and it is used in a breakdown scenario
  const firstRowForNonBreakdown = (
    data.rows.length ? data.rows : [{ [primaryMetricColumn.id]: null }]
  ).slice(0, 1);

  const metricConfigs: MetricSpec['data'][number] = (
    breakdownByColumn ? data.rows : firstRowForNonBreakdown
  ).map((row, rowIdx) => {
    const value: number | string =
      row[primaryMetricColumn.id] !== null ? row[primaryMetricColumn.id] : NaN;
    const title = breakdownByColumn
      ? formatBreakdownValue(row[breakdownByColumn.id])
      : primaryMetricColumn.name;
    const subtitle = breakdownByColumn ? primaryMetricColumn.name : config.metric.subtitle;

    if (typeof value !== 'number') {
      const nonNumericMetricBase: Omit<MetricWText, 'value'> = {
        title: String(title),
        subtitle,
        icon: config.metric?.icon ? getIcon(config.metric?.icon) : undefined,
        extra: renderSecondaryMetric(data.columns, row, config),
        color: config.metric.color ?? defaultColor,
      };
      return Array.isArray(value)
        ? { ...nonNumericMetricBase, value: value.map((v) => formatPrimaryMetric(v)) }
        : { ...nonNumericMetricBase, value: formatPrimaryMetric(value) };
    }

    const baseMetric: MetricWNumber = {
      value,
      valueFormatter: formatPrimaryMetric,
      title: String(title),
      subtitle,
      icon: config.metric?.icon ? getIcon(config.metric?.icon) : undefined,
      extra: renderSecondaryMetric(data.columns, row, config),
      color:
        config.metric.palette && value != null
          ? getColor(
              value,
              config.metric.palette,
              {
                metric: primaryMetricColumn.id,
                max: maxColId,
                breakdownBy: breakdownByColumn?.id,
              },
              data,
              rowIdx
            ) ?? defaultColor
          : config.metric.color ?? defaultColor,
    };

    const trendId = breakdownByColumn ? row[breakdownByColumn.id] : DEFAULT_TRENDLINE_NAME;
    if (config.metric.trends && config.metric.trends[trendId]) {
      const metricWTrend: MetricWTrend = {
        ...baseMetric,
        trend: config.metric.trends[trendId],
        trendShape: 'area',
        trendA11yTitle: i18n.translate('expressionMetricVis.trendA11yTitle', {
          defaultMessage: '{dataTitle} over time.',
          values: {
            dataTitle: primaryMetricColumn.name,
          },
        }),
        trendA11yDescription: i18n.translate('expressionMetricVis.trendA11yDescription', {
          defaultMessage: 'A line chart showing the trend of the primary metric over time.',
        }),
      };

      return metricWTrend;
    }

    if (maxColId && config.metric.progressDirection) {
      const metricWProgress: MetricWProgress = {
        ...baseMetric,
        domainMax: row[maxColId],
        progressBarDirection: config.metric.progressDirection,
      };

      return metricWProgress;
    }

    return baseMetric;
  });

  if (config.metric.minTiles) {
    while (metricConfigs.length < config.metric.minTiles) {
      metricConfigs.push(undefined);
    }
  }

  const {
    metric: { maxCols },
  } = config;
  const numRows = metricConfigs.length / maxCols;

  const minHeight = chartBaseTheme.metric.minHeight;

  useEffect(() => {
    const minimumRequiredVerticalSpace = minHeight * numRows;
    setScrollChildHeight(
      (scrollDimensions.height ?? -Infinity) > minimumRequiredVerticalSpace
        ? '100%'
        : `${minimumRequiredVerticalSpace}px`
    );
  }, [numRows, minHeight, scrollDimensions.height]);

  const { theme: settingsThemeOverrides = {}, ...settingsOverrides } = getOverridesFor(
    overrides,
    'settings'
  ) as Partial<SettingsProps>;

  const newGrid: MetricSpec['data'] = [];
  for (let i = 0; i < metricConfigs.length; i += maxCols) {
    newGrid.push(metricConfigs.slice(i, i + maxCols));
  }

  grid.current = newGrid;

  return (
    <div
      ref={scrollContainerRef}
      css={css`
        height: 100%;
        width: 100%;
        overflow-y: auto;
        ${useEuiScrollBar()}
      `}
    >
      <div
        css={css`
          height: ${scrollChildHeight};
        `}
      >
        <Chart {...getOverridesFor(overrides, 'chart')}>
          <Settings
            onWillRender={onWillRender}
            locale={i18n.getLocale()}
            theme={[
              {
                background: { color: defaultColor },
                metric: {
                  barBackground: euiThemeVars.euiColorLightShade,
                  emptyBackground: euiThemeVars.euiColorEmptyShade,
                  blendingBackground: euiThemeVars.euiColorEmptyShade,
                  titlesTextAlign: config.metric.titlesTextAlign,
                  valuesTextAlign: config.metric.valuesTextAlign,
                  iconAlign: config.metric.iconAlign,
                  valueFontSize: config.metric.valueFontSize,
                },
              },
              ...(Array.isArray(settingsThemeOverrides)
                ? settingsThemeOverrides
                : [settingsThemeOverrides]),
            ]}
            baseTheme={chartBaseTheme}
            onRenderChange={onRenderChange}
            onElementClick={
              filterable
                ? (events) => {
                    const colRef = breakdownByColumn ?? primaryMetricColumn;
                    const rowLength = grid.current[0].length;
                    events.forEach((event) => {
                      if (isMetricElementEvent(event)) {
                        const colIdx = data.columns.findIndex((col) => col === colRef);
                        fireEvent(
                          buildFilterEvent(
                            event.rowIndex * rowLength + event.columnIndex,
                            colIdx,
                            data
                          )
                        );
                      }
                    });
                  }
                : undefined
            }
            {...settingsOverrides}
          />
          <Metric id="metric" data={grid.current} />
        </Chart>
      </div>
    </div>
  );
};
