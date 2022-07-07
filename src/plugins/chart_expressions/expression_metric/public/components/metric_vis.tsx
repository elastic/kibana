/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';

import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { Chart, Metric, MetricSpec, RenderChangeListener, Settings } from '@elastic/charts';
import { getColumnByAccessor, getFormatByAccessor } from '@kbn/visualizations-plugin/common/utils';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import {
  Datatable,
  DatatableColumn,
  DatatableRow,
  IInterpreterRenderHandlers,
} from '@kbn/expressions-plugin';
import { CustomPaletteState } from '@kbn/charts-plugin/public';
import { euiLightVars } from '@kbn/ui-theme';
import { FORMATS_UI_SETTINGS } from '@kbn/field-formats-plugin/common';
import { VisParams } from '../../common';
import {
  getPaletteService,
  getThemeService,
  getFormatService,
  getUiSettingsService,
} from '../services';
import { getCurrencyCode } from './currency_codes';

const defaultColor = euiLightVars.euiColorDarkestShade;

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

const getFormatter = (
  accessor: ExpressionValueVisDimension | string,
  columns: Datatable['columns']
) => {
  const serializedFieldFormat = getFormatByAccessor(accessor, columns);
  const formatId = serializedFieldFormat?.id ?? 'number';

  if (!['number', 'currency', 'percent', 'bytes', 'duration'].includes(formatId)) {
    throw new Error(
      i18n.translate('expressionMetricVis.errors.unsupportedColumnFormat', {
        defaultMessage: 'Metric Visualization - Unsupported column format: "{id}"',
        values: {
          id: formatId,
        },
      })
    );
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

const getColor = (value: number, paletteParams: CustomPaletteState | undefined) =>
  paletteParams
    ? getPaletteService().get('custom')?.getColorForValue?.(value, paletteParams, {
        min: paletteParams.rangeMin,
        max: paletteParams.rangeMax,
      }) || defaultColor
    : defaultColor;

export interface MetricVisComponentProps {
  data: Datatable;
  config: Pick<VisParams, 'metric' | 'dimensions'>;
  renderComplete: IInterpreterRenderHandlers['done'];
}

const MetricVisComponent = ({ data, config, renderComplete }: MetricVisComponentProps) => {
  const primaryMetricColumn = getColumnByAccessor(config.dimensions.metric, data.columns)!;
  const formatPrimaryMetric = getFormatter(config.dimensions.metric, data.columns);

  let secondaryMetricColumn: DatatableColumn | undefined;
  let formatSecondaryMetric: ReturnType<typeof getFormatter>;
  if (config.dimensions.secondaryMetric) {
    secondaryMetricColumn = getColumnByAccessor(config.dimensions.secondaryMetric, data.columns);
    formatSecondaryMetric = getFormatter(config.dimensions.secondaryMetric, data.columns);
  }

  const breakdownByColumn = config.dimensions.breakdownBy
    ? getColumnByAccessor(config.dimensions.breakdownBy, data.columns)
    : undefined;

  let getProgressBarConfig = (_row: DatatableRow) => ({});

  if (config.dimensions.progressMax) {
    const maxColId = getColumnByAccessor(config.dimensions.progressMax, data.columns)?.id;
    if (maxColId) {
      getProgressBarConfig = (_row: DatatableRow) => ({
        domain: {
          min: 0,
          max: _row[maxColId],
        },
        progressBarDirection: config.metric.progressDirection,
      });
    }
  }

  const metricConfigs: MetricSpec['data'][number] = (
    breakdownByColumn ? data.rows : data.rows.slice(0, 1)
  ).map((row) => {
    const value = row[primaryMetricColumn.id];
    const title = breakdownByColumn ? row[breakdownByColumn.id] : primaryMetricColumn.name;
    const subtitle = breakdownByColumn
      ? primaryMetricColumn.name
      : secondaryMetricColumn?.name ?? config.metric.subtitle;
    return {
      value,
      valueFormatter: formatPrimaryMetric,
      title,
      subtitle,
      extra: (
        <span>
          {secondaryMetricColumn
            ? formatSecondaryMetric!(row[secondaryMetricColumn.id])
            : config.metric.extraText}
        </span>
      ),
      color: getColor(value, config.metric.palette),
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

  return (
    <Chart>
      <Settings
        theme={[{ background: { color: 'transparent' } }, chartTheme]}
        onRenderChange={onRenderChange}
      />
      <Metric id="metric" data={grid} />
    </Chart>
  );
};

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { MetricVisComponent as default };
