/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

/**
 * Specific reasons why ES|QL conversion failed.
 * These are used to provide granular user feedback.
 */
export type EsqlConversionFailureReason =
  | 'formula_not_supported'
  | 'time_shift_not_supported'
  | 'runtime_field_not_supported'
  | 'reduced_time_range_not_supported'
  | 'function_not_supported'
  | 'include_empty_rows_not_supported'
  | 'terms_date_histogram_not_supported'
  | 'terms_multi_level_not_supported'
  | 'terms_multiple_fields_not_supported'
  | 'terms_accuracy_mode_not_supported'
  | 'terms_include_exclude_not_supported'
  | 'terms_other_bucket_not_supported'
  | 'terms_order_by_not_supported'
  | 'terms_custom_order_by_not_supported'
  | 'terms_rank_metric_not_supported'
  | 'saved_to_library_not_supported'
  | 'query_annotations_not_supported'
  | 'reference_line_not_supported'
  | 'trendline_not_supported'
  | 'unsupported_settings'
  | 'unknown';

export const esqlConversionFailureTitle = i18n.translate(
  'xpack.lens.config.cannotConvertToEsqlTitle',
  {
    defaultMessage: 'Cannot convert to ES|QL',
  }
);

/**
 * Sentence-only tooltip bodies for each conversion failure reason.
 * IDs ending in `Reason` were rotated when the shared title was split out of the messages,
 * so stale full-tooltip translations are not shown with the title prepended a second time.
 */
export const esqlConversionFailureReasonMessages: Record<EsqlConversionFailureReason, string> = {
  formula_not_supported: i18n.translate('xpack.lens.config.cannotConvertToEsqlFormulaReason', {
    defaultMessage: 'Formula operations will be supported in an upcoming update.',
  }),
  time_shift_not_supported: i18n.translate('xpack.lens.config.cannotConvertToEsqlTimeShiftReason', {
    defaultMessage: 'Time shift will be supported in an upcoming update.',
  }),
  runtime_field_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlRuntimeFieldReason',
    {
      defaultMessage: 'Runtime fields will be supported in an upcoming update.',
    }
  ),
  reduced_time_range_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlReducedTimeRangeReason',
    {
      defaultMessage: 'Reduced time range will be supported in an upcoming update.',
    }
  ),
  function_not_supported: i18n.translate('xpack.lens.config.cannotConvertToEsqlOperationReason', {
    defaultMessage: 'Support for one or more functions used will be coming in an upcoming update.',
  }),
  include_empty_rows_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlIncludeEmptyRowsReason',
    {
      defaultMessage: '"Include empty rows" will be supported in an upcoming update.',
    }
  ),
  terms_date_histogram_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlTermsDateHistogramNestingTooltip',
    {
      defaultMessage:
        'This arrangement of Top values and date histogram dimensions is not supported yet.',
    }
  ),
  terms_multi_level_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlTermsMultiLevelTooltip',
    {
      defaultMessage: 'More than two Top values dimensions is not supported.',
    }
  ),
  terms_multiple_fields_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlTermsMultipleFieldsTooltip',
    {
      defaultMessage: 'Top values with more than one field is not supported.',
    }
  ),
  terms_accuracy_mode_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlTermsAccuracyModeTooltip',
    {
      defaultMessage: '"Enable accuracy mode" for Top values has no ES|QL equivalent.',
    }
  ),
  terms_include_exclude_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlTermsIncludeExcludeTooltip',
    {
      defaultMessage:
        'Top values filtered by "Include values" or "Exclude values" is not supported.',
    }
  ),
  terms_other_bucket_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlTermsOtherBucketTooltip',
    {
      defaultMessage:
        'Grouping remaining values as "Other" will be supported in an upcoming update.',
    }
  ),
  terms_order_by_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlTermsOrderByTooltip',
    {
      defaultMessage: 'Ranking Top values by rarity or significance has no ES|QL equivalent.',
    }
  ),
  terms_custom_order_by_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlTermsCustomOrderByTooltip',
    {
      defaultMessage:
        'Ranking Top values by a custom metric that is not in the chart is not supported.',
    }
  ),
  terms_rank_metric_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlTermsRankMetricTooltip',
    {
      defaultMessage: 'The metric used to rank Top values cannot be converted.',
    }
  ),
  saved_to_library_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertSavedToLibraryTooltip',
    {
      defaultMessage: 'Charts saved to library will be supported in an upcoming update.',
    }
  ),
  query_annotations_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlQueryAnnotationsTooltip',
    {
      defaultMessage: 'Query-based annotations will be supported in an upcoming update.',
    }
  ),
  reference_line_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlReferenceLineTooltip',
    {
      defaultMessage: 'Only static value reference lines are supported for conversion.',
    }
  ),
  trendline_not_supported: i18n.translate('xpack.lens.config.cannotConvertToEsqlTrendlineReason', {
    defaultMessage:
      'The trendline layer uses a configuration that is not yet supported for conversion.',
  }),
  unsupported_settings: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlUnsupportedSettingsReason',
    {
      defaultMessage: 'Some settings used will be supported in an upcoming update.',
    }
  ),
  unknown: i18n.translate('xpack.lens.config.cannotConvertToEsqlUnknownReason', {
    defaultMessage: 'This visualization will be supported in an upcoming update.',
  }),
};

/** Builds tooltip content for a conversion failure */
export const getFailureTooltip = (
  reason: EsqlConversionFailureReason | undefined
): { title: string; message: string } => ({
  title: esqlConversionFailureTitle,
  message:
    esqlConversionFailureReasonMessages[reason ?? 'unknown'] ??
    esqlConversionFailureReasonMessages.unsupported_settings,
});

export const getFailureTooltipText = (reason: EsqlConversionFailureReason | undefined): string => {
  const { title, message } = getFailureTooltip(reason);
  return i18n.translate('xpack.lens.config.cannotConvertToEsqlTooltipWithReason', {
    defaultMessage: '{title}: {message}',
    values: { title, message },
  });
};
