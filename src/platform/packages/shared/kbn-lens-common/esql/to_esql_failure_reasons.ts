/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { AnnotationConversionFailureReason } from './convert_annotations_to_esql';

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
  | 'annotation_library_not_supported'
  | 'query_annotation_global_filters_not_supported'
  | 'query_annotation_data_view_not_found'
  | 'query_annotation_time_field_not_found'
  | 'query_annotation_filter_not_convertible'
  | 'query_annotation_data_view_only_field_not_supported'
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
        'Grouping remaining values as "Other" is only supported for a single Top values dimension that is not nested under another bucket and does not include documents without the selected field.',
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
  annotation_library_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlAnnotationLibraryReason',
    {
      defaultMessage: 'Annotation groups from the library cannot be converted.',
    }
  ),
  query_annotation_global_filters_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlQueryAnnotationGlobalFiltersReason',
    {
      defaultMessage:
        'Query-based annotations that apply global filters cannot be converted, because ES|QL annotations ignore them.',
    }
  ),
  query_annotation_data_view_not_found: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlQueryAnnotationDataViewNotFoundReason',
    {
      defaultMessage: 'The data view of a query-based annotation layer could not be found.',
    }
  ),
  query_annotation_time_field_not_found: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlQueryAnnotationTimeFieldReason',
    {
      defaultMessage: 'A query-based annotation has no time field to convert.',
    }
  ),
  query_annotation_filter_not_convertible: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlQueryAnnotationFilterReason',
    {
      defaultMessage: 'The filter of a query-based annotation cannot be expressed in ES|QL.',
    }
  ),
  query_annotation_data_view_only_field_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlQueryAnnotationDataViewOnlyFieldReason',
    {
      defaultMessage:
        'A query-based annotation uses a runtime or scripted data view field, which ES|QL cannot query.',
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

/** Maps each annotation conversion failure to its tooltip reason; exhaustive by construction. */
export const annotationConversionFailureToReason: Record<
  AnnotationConversionFailureReason,
  EsqlConversionFailureReason
> = {
  global_filters_not_supported: 'query_annotation_global_filters_not_supported',
  data_view_not_found: 'query_annotation_data_view_not_found',
  time_field_not_found: 'query_annotation_time_field_not_found',
  filter_not_convertible: 'query_annotation_filter_not_convertible',
  data_view_only_field_not_supported: 'query_annotation_data_view_only_field_not_supported',
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
