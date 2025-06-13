/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
import type {
  Datatable,
  DatatableColumn,
  IInterpreterRenderHandlers,
} from '@kbn/expressions-plugin/common';
import { FieldFormatConvertFunction } from '@kbn/field-formats-plugin/common';
import { css } from '@emotion/react';
import { useResizeObserver, useEuiScrollBar, EuiIcon, useEuiTheme } from '@elastic/eui';
import { AllowedChartOverrides, AllowedSettingsOverrides } from '@kbn/charts-plugin/common';
import { type ChartSizeEvent, getOverridesFor } from '@kbn/chart-expressions-common';
import { DEFAULT_TRENDLINE_NAME } from '../../common/constants';
import { VisParams } from '../../common';
import { getThemeService, getFormatService } from '../services';
import { getColor, getMetricFormatter } from './helpers';
import { SecondaryMetric, TrendConfig } from './secondary_metric';

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
    <EuiIcon type={type} fill={color} css={{ width, height }} />;

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
  const {
    euiTheme: { colors },
  } = useEuiTheme();
  const defaultColor = colors.emptyShade;

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
  const formatPrimaryMetric = useMemo(
    () => getMetricFormatter(config.dimensions.metric, data.columns),
    [config.dimensions.metric, data.columns]
  );

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

    const hasDynamicColoring = config.metric.palette?.params && value != null;
    const tileColor =
      config.metric.palette?.params && typeof value === 'number'
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
        : config.metric.color ?? defaultColor;

    const trendConfig: TrendConfig | undefined = config.metric.secondaryTrend.palette
      ? {
          icon: config.metric.secondaryTrend.visuals !== 'value',
          value: config.metric.secondaryTrend.visuals !== 'icon',
          baselineValue:
            config.metric.secondaryTrend.baseline === 'primary' && typeof value === 'number'
              ? value
              : Number(config.metric.secondaryTrend.baseline),
          palette: config.metric.secondaryTrend.palette,
          borderColor: undefined,
          compareToPrimary: config.metric.secondaryTrend.baseline === 'primary',
        }
      : undefined;

    if (typeof value !== 'number') {
      const nonNumericMetricBase: Omit<MetricWText, 'value'> = {
        title: String(title),
        subtitle,
        icon: config.metric?.icon ? getIcon(config.metric?.icon) : undefined,
        extra: ({ color }) => (
          <SecondaryMetric
            row={row}
            config={config}
            columns={data.columns}
            getMetricFormatter={getMetricFormatter}
            color={config.metric.secondaryColor}
            trendConfig={
              hasDynamicColoring && trendConfig
                ? { ...trendConfig, borderColor: color }
                : trendConfig
            }
          />
        ),
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
      extra: ({ color }) => (
        <SecondaryMetric
          row={row}
          config={config}
          columns={data.columns}
          getMetricFormatter={getMetricFormatter}
          color={config.metric.secondaryColor}
          trendConfig={
            hasDynamicColoring && trendConfig ? { ...trendConfig, borderColor: color } : trendConfig
          }
        />
      ),
      color: tileColor,
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

  // this needs to use a useEffect as it depends on the scrollContainerRef
  // which is not available on the first render
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
                  barBackground: colors.lightShade,
                  emptyBackground: colors.emptyShade,
                  blendingBackground: colors.emptyShade,
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
