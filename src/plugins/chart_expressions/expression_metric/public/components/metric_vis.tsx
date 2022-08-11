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
} from '@elastic/charts';
import { getColumnByAccessor, getFormatByAccessor } from '@kbn/visualizations-plugin/common/utils';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import type {
  Datatable,
  DatatableColumn,
  DatatableRow,
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
  const formatId = serializedFieldFormat?.id ?? 'number';

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
  let minBound = paletteParams.rangeMin;
  let maxBound = paletteParams.rangeMax;

  const { min, max } = getDataBoundsForPalette(accessors, data, rowNumber);
  minBound = min;
  maxBound = max;

  return getPaletteService().get(CUSTOM_PALETTE)?.getColorForValue?.(value, paletteParams, {
    min: minBound,
    max: maxBound,
  });
};

const buildFilterEvent = (rowIdx: number, columnIdx: number, table: Datatable) => {
  return {
    name: 'filter',
    data: {
      data: [
        {
          table,
          column: columnIdx,
          row: rowIdx,
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

  let getProgressBarConfig = (_row: DatatableRow): Partial<MetricWProgress> => ({});

  const maxColId = config.dimensions.max
    ? getColumnByAccessor(config.dimensions.max, data.columns)?.id
    : undefined;
  if (maxColId) {
    getProgressBarConfig = (_row: DatatableRow): Partial<MetricWProgress> => ({
      domainMax: _row[maxColId],
      progressBarDirection: config.metric.progressDirection,
    });
  }

  const metricConfigs: MetricSpec['data'][number] = (
    breakdownByColumn ? data.rows : data.rows.slice(0, 1)
  ).map((row, rowIdx) => {
    const value = row[primaryMetricColumn.id];
    const title = breakdownByColumn
      ? formatBreakdownValue(row[breakdownByColumn.id])
      : primaryMetricColumn.name;
    const subtitle = breakdownByColumn ? primaryMetricColumn.name : config.metric.subtitle;
    return {
      value,
      valueFormatter: formatPrimaryMetric,
      title,
      subtitle,
      extra: (
        <span>
          {config.metric.secondaryPrefix}
          {secondaryMetricColumn
            ? `${config.metric.secondaryPrefix ? ' ' : ''}${formatSecondaryMetric!(
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
      ...getProgressBarConfig(row),
    };
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

  useEffect(() => {
    const minTileHeight = 64; // TODO - magic number from the @elastic/charts side. would be nice to deduplicate
    const minimumRequiredVerticalSpace = minTileHeight * grid.length;
    setScrollChildHeight(
      (scrollDimensions.height ?? -Infinity) > minimumRequiredVerticalSpace
        ? '100%'
        : `${minimumRequiredVerticalSpace}px`
    );
  }, [grid.length, scrollDimensions.height]);

  // force chart to re-render to circumvent a charts bug
  const magicKey = useRef(0);
  useEffect(() => {
    magicKey.current++;
  }, [data]);

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
        <Chart key={magicKey.current}>
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
