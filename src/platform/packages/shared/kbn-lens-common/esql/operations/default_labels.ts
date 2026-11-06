/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { TranslateArguments } from '@kbn/i18n';
import { memoize } from 'lodash';
import { getCalculateAutoTimeExpression } from '@kbn/data-plugin/common';
import {
  AVG_ID,
  CARDINALITY_ID,
  COUNT_ID,
  MAX_ID,
  MEDIAN_ID,
  MIN_ID,
  PERCENTILE_ID,
  STD_DEVIATION_ID,
  SUM_ID,
} from '@kbn/lens-formula-docs';
import type { DateRange, IndexPattern, IndexPatternField, TimeScaleUnit } from '../../types';
import type { BaseIndexPatternColumn, GenericIndexPatternColumn } from '../../datasources/types';
import type {
  CardinalityIndexPatternColumn,
  CountIndexPatternColumn,
  DateHistogramIndexPatternColumn,
  MetricColumn,
  PercentileIndexPatternColumn,
  StaticValueIndexPatternColumn,
} from '../../datasources/operations';
import { adjustTimeScaleLabelSuffix } from '../../datasources/time_scale_utils';
import { getSafeName } from '../../datasources/form_based/helpers';
import { AUTO_INTERVAL } from './date_histogram_helpers';
import type { EsqlOperationColumnMap, EsqlSupportedOperation, UiSettingsReader } from './types';
import { DATE_HISTOGRAM_ID, STATIC_VALUE_ID } from './registry';

/**
 * Resolves the default (non custom) label for a column.
 * Mirrors `OperationDefinition['getDefaultLabel']` with node-safe types.
 */
export type GetDefaultLabelFn<C extends BaseIndexPatternColumn = BaseIndexPatternColumn> = (
  column: C,
  columns: Record<string, GenericIndexPatternColumn>,
  indexPattern?: IndexPattern,
  uiSettings?: UiSettingsReader,
  dateRange?: DateRange
) => string;

export const countLabel = i18n.translate('xpack.lens.indexPattern.countOf', {
  defaultMessage: 'Count of records',
});

export function ofNameCount(
  field: IndexPatternField | undefined,
  timeShift: string | undefined,
  timeScale: string | undefined,
  reducedTimeRange: string | undefined
) {
  if (field?.customLabel && field?.type !== 'document') {
    return field.customLabel;
  }

  return adjustTimeScaleLabelSuffix(
    field?.type !== 'document'
      ? i18n.translate('xpack.lens.indexPattern.valueCountOf', {
          defaultMessage: 'Count of {name}',
          values: {
            name: field?.displayName || '-',
          },
        })
      : countLabel,
    undefined,
    timeScale as TimeScaleUnit,
    undefined,
    timeShift,
    undefined,
    reducedTimeRange
  );
}

export const getCountDefaultLabel: GetDefaultLabelFn<CountIndexPatternColumn> = (
  column,
  _columns,
  indexPattern
) => {
  const field = indexPattern?.getFieldByName(column.sourceField);
  return ofNameCount(field, column.timeShift, column.timeScale, column.reducedTimeRange);
};

export function ofNameCardinality(
  name: string,
  timeShift: string | undefined,
  reducedTimeRange: string | undefined
) {
  return adjustTimeScaleLabelSuffix(
    i18n.translate('xpack.lens.indexPattern.cardinalityOf', {
      defaultMessage: 'Unique count of {name}',
      values: {
        name,
      },
    }),
    undefined,
    undefined,
    undefined,
    timeShift,
    undefined,
    reducedTimeRange
  );
}

export const getCardinalityDefaultLabel: GetDefaultLabelFn<CardinalityIndexPatternColumn> = (
  column,
  _columns,
  indexPattern
) =>
  ofNameCardinality(
    getSafeName(column.sourceField, indexPattern),
    column.timeShift,
    column.reducedTimeRange
  );

/** Maximum number of decimal digits allowed for percentile values. */
export const ALLOWED_DECIMAL_DIGITS = 4;

export function ofNamePercentile(
  name: string,
  percentile: number,
  timeShift: string | undefined,
  reducedTimeRange: string | undefined
) {
  const formatters: TranslateArguments['formatters'] = {
    getNumberFormat: memoize(
      (locale, opts) =>
        new Intl.NumberFormat(locale, {
          ...(opts as Intl.NumberFormatOptions), // To resolve a type mismatch in the 'useGrouping' property
          maximumFractionDigits: ALLOWED_DECIMAL_DIGITS,
        })
    ),
    // @ts-expect-error - There’s a small mismatch between @formatjs type and Intl API that only applies to the date function, we’re ignoring that
    getDateTimeFormat: memoize((locale, opts) => new Intl.DateTimeFormat(locale, opts)),
    getPluralRules: memoize(
      (locale, opts) =>
        new Intl.PluralRules(locale, {
          ...opts,
          maximumFractionDigits: ALLOWED_DECIMAL_DIGITS, // ensures the correct ordinal suffix is selected based on the matching number of decimal digits used in the number formatter
        })
    ),
  };

  return adjustTimeScaleLabelSuffix(
    i18n.translate('xpack.lens.indexPattern.percentileOf', {
      defaultMessage:
        '{percentile, selectordinal, one {#st} two {#nd} few {#rd} other {#th}} percentile of {name}',
      values: { name, percentile },
      formatters,
    }),
    undefined,
    undefined,
    undefined,
    timeShift,
    undefined,
    reducedTimeRange
  );
}

export const getPercentileDefaultLabel: GetDefaultLabelFn<PercentileIndexPatternColumn> = (
  column,
  _columns,
  indexPattern
) =>
  ofNamePercentile(
    getSafeName(column.sourceField, indexPattern),
    column.params.percentile,
    column.timeShift,
    column.reducedTimeRange
  );

const metricOfNames: Record<string, (name: string) => string> = {
  [MIN_ID]: (name) =>
    i18n.translate('xpack.lens.indexPattern.minOf', {
      defaultMessage: 'Minimum of {name}',
      values: { name },
    }),
  [MAX_ID]: (name) =>
    i18n.translate('xpack.lens.indexPattern.maxOf', {
      defaultMessage: 'Maximum of {name}',
      values: { name },
    }),
  [AVG_ID]: (name) =>
    i18n.translate('xpack.lens.indexPattern.avgOf', {
      defaultMessage: 'Average of {name}',
      values: { name },
    }),
  [SUM_ID]: (name) =>
    i18n.translate('xpack.lens.indexPattern.sumOf', {
      defaultMessage: 'Sum of {name}',
      values: { name },
    }),
  [MEDIAN_ID]: (name) =>
    i18n.translate('xpack.lens.indexPattern.medianOf', {
      defaultMessage: 'Median of {name}',
      values: { name },
    }),
  [STD_DEVIATION_ID]: (name) =>
    i18n.translate('xpack.lens.indexPattern.standardDeviationOf', {
      defaultMessage: 'Standard deviation of {name}',
      values: { name },
    }),
};

export const ofNameMetric = (type: string, name: string) => metricOfNames[type]?.(name) ?? name;

/** Metric operations supporting the optional time scaling suffix in labels. */
const METRICS_WITH_OPTIONAL_TIME_SCALING = new Set([SUM_ID]);

export const buildMetricDefaultLabel =
  (type: string): GetDefaultLabelFn<MetricColumn<string>> =>
  (column, _columns, indexPattern) =>
    adjustTimeScaleLabelSuffix(
      ofNameMetric(type, getSafeName(column.sourceField, indexPattern)),
      undefined,
      METRICS_WITH_OPTIONAL_TIME_SCALING.has(type) ? column.timeScale : undefined,
      undefined,
      column.timeShift,
      undefined,
      column.reducedTimeRange
    );

export const getDateHistogramDefaultLabel: GetDefaultLabelFn<DateHistogramIndexPatternColumn> = (
  column,
  _columns,
  indexPattern,
  uiSettings,
  dateRange
) => {
  const field = getSafeName(column.sourceField, indexPattern);
  let interval = column.params?.interval || AUTO_INTERVAL;
  if (dateRange && uiSettings) {
    const calcAutoInterval = getCalculateAutoTimeExpression((key) => uiSettings.get(key));
    interval =
      calcAutoInterval({ from: dateRange.fromDate, to: dateRange.toDate }, interval, false)
        ?.description || 'hour';
    return i18n.translate('xpack.lens.indexPattern.dateHistogram.interval', {
      defaultMessage: `{field} per {interval}`,
      values: {
        field: field || '',
        interval,
      },
    });
  }
  return field;
};

export const staticValueLabelDefault = i18n.translate(
  'xpack.lens.indexPattern.staticValueLabelDefault',
  {
    defaultMessage: 'Static value',
  }
);

function isEmptyStaticValue(value: number | string | undefined) {
  return value == null || value === '';
}

export function ofNameStaticValue(value: number | string | undefined) {
  if (isEmptyStaticValue(value)) {
    return staticValueLabelDefault;
  }
  return i18n.translate('xpack.lens.indexPattern.staticValueLabelWithValue', {
    defaultMessage: 'Static value: {value}',
    values: { value },
  });
}

export const getStaticValueDefaultLabel: GetDefaultLabelFn<StaticValueIndexPatternColumn> = (
  column
) => ofNameStaticValue(column.params?.value);

/**
 * UI-free registry of per-operation default-label resolvers. Each entry is
 * precisely typed against its column type via `EsqlOperationColumnMap`.
 * Mirrors `OperationDefinition['getDefaultLabel']` for the operations
 * participating in the DSL-to-ES|QL conversion.
 */
export const defaultLabelRegistry: {
  [K in EsqlSupportedOperation]?: GetDefaultLabelFn<EsqlOperationColumnMap[K]>;
} = {
  [COUNT_ID]: getCountDefaultLabel,
  [CARDINALITY_ID]: getCardinalityDefaultLabel,
  [PERCENTILE_ID]: getPercentileDefaultLabel,
  [MIN_ID]: buildMetricDefaultLabel(MIN_ID),
  [MAX_ID]: buildMetricDefaultLabel(MAX_ID),
  [AVG_ID]: buildMetricDefaultLabel(AVG_ID),
  [SUM_ID]: buildMetricDefaultLabel(SUM_ID),
  [MEDIAN_ID]: buildMetricDefaultLabel(MEDIAN_ID),
  [STD_DEVIATION_ID]: buildMetricDefaultLabel(STD_DEVIATION_ID),
  [DATE_HISTOGRAM_ID]: getDateHistogramDefaultLabel,
  [STATIC_VALUE_ID]: getStaticValueDefaultLabel,
};

/**
 * Dynamic-dispatch read of {@link defaultLabelRegistry}. The widening to the
 * base column type is deliberate; the caller selects the entry via
 * `column.operationType`, which guarantees the key/column correlation.
 */
export const getDefaultLabelFn = (operationType: string): GetDefaultLabelFn | undefined =>
  operationType in defaultLabelRegistry
    ? (defaultLabelRegistry[operationType as EsqlSupportedOperation] as GetDefaultLabelFn)
    : undefined;
