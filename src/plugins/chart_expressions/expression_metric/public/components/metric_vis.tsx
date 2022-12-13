/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import numeral from '@elastic/numeral';
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
} from '@elastic/charts';
import { getColumnByAccessor, getFormatByAccessor } from '@kbn/visualizations-plugin/common/utils';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import type {
  Datatable,
  DatatableColumn,
  IInterpreterRenderHandlers,
  RenderMode,
} from '@kbn/expressions-plugin/common';
import { CustomPaletteState } from '@kbn/charts-plugin/public';
import { FORMATS_UI_SETTINGS } from '@kbn/field-formats-plugin/common';
import type { FieldFormatConvertFunction } from '@kbn/field-formats-plugin/common';
import { CUSTOM_PALETTE } from '@kbn/coloring';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { useResizeObserver } from '@elastic/eui';
import { DEFAULT_TRENDLINE_NAME } from '../../common/constants';
import { VisParams } from '../../common';
import {
  getPaletteService,
  getThemeService,
  getFormatService,
  getUiSettingsService,
} from '../services';
import { getCurrencyCode } from './currency_codes';
import { getDataBoundsForPalette } from '../utils';

export const defaultColor = euiThemeVars.euiColorLightestShade;
const getBytesUnit = (value: number) => {
  const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte', 'petabyte'];
  const abs = Math.abs(value);

  const base = 1024;
  let unit = units[0];
  let matched = abs < base;
  let power;

  if (!matched) {
    for (power = 1; power < units.length; power++) {
      const [min, max] = [Math.pow(base, power), Math.pow(base, power + 1)];
      if (abs >= min && abs < max) {
        unit = units[power];
        matched = true;
        value = value / min;
        break;
      }
    }
  }

  if (!matched) {
    value = value / Math.pow(base, units.length - 1);
    unit = units[units.length - 1];
  }

  return { value, unit };
};

const getMetricFormatter = (
  accessor: ExpressionValueVisDimension | string,
  columns: Datatable['columns']
) => {
  const serializedFieldFormat = getFormatByAccessor(accessor, columns);
  const formatId =
    (serializedFieldFormat?.id === 'suffix'
      ? serializedFieldFormat.params?.id
      : serializedFieldFormat?.id) ?? 'number';

  if (
    !['number', 'currency', 'percent', 'bytes', 'duration', 'string', 'null'].includes(formatId)
  ) {
    throw new Error(
      i18n.translate('expressionMetricVis.errors.unsupportedColumnFormat', {
        defaultMessage: 'Metric visualization expression - Unsupported column format: "{id}"',
        values: {
          id: formatId,
        },
      })
    );
  }

  // this formats are coming when formula is empty
  if (formatId === 'string') {
    return getFormatService().deserialize(serializedFieldFormat).getConverterFor('text');
  }

  if (formatId === 'duration') {
    const formatter = getFormatService().deserialize({
      ...serializedFieldFormat,
      params: {
        ...serializedFieldFormat!.params,
        outputFormat: 'humanizePrecise',
        outputPrecision: 1,
        useShortSuffix: true,
      },
    });
    return formatter.getConverterFor('text');
  }

  const uiSettings = getUiSettingsService();

  const locale = uiSettings.get(FORMATS_UI_SETTINGS.FORMAT_NUMBER_DEFAULT_LOCALE) || 'en';

  const intlOptions: Intl.NumberFormatOptions = {
    maximumFractionDigits: 2,
  };

  if (['number', 'currency', 'percent'].includes(formatId)) {
    intlOptions.notation = 'compact';
  }

  if (formatId === 'currency') {
    const currentNumeralLang = numeral.language();
    numeral.language(locale);

    const {
      currency: { symbol: currencySymbol },
      // @ts-expect-error
    } = numeral.languageData();

    // restore previous value
    numeral.language(currentNumeralLang);

    intlOptions.currency = getCurrencyCode(locale, currencySymbol);
    intlOptions.style = 'currency';
  }

  if (formatId === 'percent') {
    intlOptions.style = 'percent';
  }

  return formatId === 'bytes'
    ? (rawValue: number) => {
        const { value, unit } = getBytesUnit(rawValue);
        return new Intl.NumberFormat(locale, { ...intlOptions, style: 'unit', unit }).format(value);
      }
    : new Intl.NumberFormat(locale, intlOptions).format;
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

export interface MetricVisComponentProps {
  data: Datatable;
  config: Pick<VisParams, 'metric' | 'dimensions'>;
  renderComplete: IInterpreterRenderHandlers['done'];
  fireEvent: IInterpreterRenderHandlers['event'];
  renderMode: RenderMode;
  filterable: boolean;
}

export const MetricVis = ({
  data,
  config,
  renderComplete,
  fireEvent,
  renderMode,
  filterable,
}: MetricVisComponentProps) => {
  const primaryMetricColumn = getColumnByAccessor(config.dimensions.metric, data.columns)!;
  const formatPrimaryMetric = getMetricFormatter(config.dimensions.metric, data.columns);

  let secondaryMetricColumn: DatatableColumn | undefined;
  let formatSecondaryMetric: ReturnType<typeof getMetricFormatter>;
  if (config.dimensions.secondaryMetric) {
    secondaryMetricColumn = getColumnByAccessor(config.dimensions.secondaryMetric, data.columns);
    formatSecondaryMetric = getMetricFormatter(config.dimensions.secondaryMetric, data.columns);
  }

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

  const metricConfigs: MetricSpec['data'][number] = (
    breakdownByColumn ? data.rows : data.rows.slice(0, 1)
  ).map((row, rowIdx) => {
    const value: number = row[primaryMetricColumn.id] !== null ? row[primaryMetricColumn.id] : NaN;
    const title = breakdownByColumn
      ? formatBreakdownValue(row[breakdownByColumn.id])
      : primaryMetricColumn.name;
    const subtitle = breakdownByColumn ? primaryMetricColumn.name : config.metric.subtitle;
    const secondaryPrefix = config.metric.secondaryPrefix ?? secondaryMetricColumn?.name;
    const baseMetric: MetricWNumber = {
      value,
      valueFormatter: formatPrimaryMetric,
      title,
      subtitle,
      extra: (
        <span>
          {secondaryPrefix}
          {secondaryMetricColumn
            ? `${secondaryPrefix ? ' ' : ''}${formatSecondaryMetric!(
                row[secondaryMetricColumn.id]
              )}`
            : undefined}
        </span>
      ),
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
    while (metricConfigs.length < config.metric.minTiles) metricConfigs.push(undefined);
  }

  const grid: MetricSpec['data'] = [];
  const {
    metric: { maxCols },
  } = config;
  for (let i = 0; i < metricConfigs.length; i += maxCols) {
    grid.push(metricConfigs.slice(i, i + maxCols));
  }

  const chartTheme = getThemeService().useChartsTheme();
  const onRenderChange = useCallback<RenderChangeListener>(
    (isRendered) => {
      if (isRendered) {
        renderComplete();
      }
    },
    [renderComplete]
  );

  let pixelHeight;
  let pixelWidth;
  if (renderMode === 'edit') {
    // In the editor, we constrain the maximum size of the tiles for aesthetic reasons
    const maxTileSideLength = metricConfigs.flat().length > 1 ? 200 : 300;
    pixelHeight = grid.length * maxTileSideLength;
    pixelWidth = grid[0]?.length * maxTileSideLength;
  }

  const [scrollChildHeight, setScrollChildHeight] = useState<string>('100%');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollDimensions = useResizeObserver(scrollContainerRef.current);

  const baseTheme = getThemeService().useChartsBaseTheme();

  const minHeight = chartTheme.metric?.minHeight ?? baseTheme.metric.minHeight;

  useEffect(() => {
    const minimumRequiredVerticalSpace = minHeight * grid.length;
    setScrollChildHeight(
      (scrollDimensions.height ?? -Infinity) > minimumRequiredVerticalSpace
        ? '100%'
        : `${minimumRequiredVerticalSpace}px`
    );
  }, [grid.length, minHeight, scrollDimensions.height]);

  return (
    <div
      ref={scrollContainerRef}
      css={css`
        height: ${pixelHeight ? `${pixelHeight}px` : '100%'};
        width: ${pixelWidth ? `${pixelWidth}px` : '100%'};
        max-height: 100%;
        max-width: 100%;
        overflow-y: auto;
      `}
    >
      <div
        css={css`
          height: ${scrollChildHeight};
        `}
      >
        <Chart>
          <Settings
            theme={[
              {
                background: { color: 'transparent' },
                metric: {
                  background: defaultColor,
                  barBackground: euiThemeVars.euiColorLightShade,
                },
              },
              chartTheme,
            ]}
            baseTheme={baseTheme}
            onRenderChange={onRenderChange}
            onElementClick={(events) => {
              if (!filterable) {
                return;
              }
              events.forEach((event) => {
                if (isMetricElementEvent(event)) {
                  const colIdx = breakdownByColumn
                    ? data.columns.findIndex((col) => col === breakdownByColumn)
                    : data.columns.findIndex((col) => col === primaryMetricColumn);
                  const rowLength = grid[0].length;
                  fireEvent(
                    buildFilterEvent(event.rowIndex * rowLength + event.columnIndex, colIdx, data)
                  );
                }
              });
            }}
          />
          <Metric id="metric" data={grid} />
        </Chart>
      </div>
    </div>
  );
};
