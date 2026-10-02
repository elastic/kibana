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
  | 'drop_partials_not_supported'
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

/** Top values reasons whose tooltip body is a sentence under a shared title. */
const TERMS_FAILURE_REASONS = new Set<EsqlConversionFailureReason>([
  'terms_date_histogram_not_supported',
  'terms_multi_level_not_supported',
  'terms_multiple_fields_not_supported',
  'terms_accuracy_mode_not_supported',
  'terms_include_exclude_not_supported',
  'terms_other_bucket_not_supported',
  'terms_order_by_not_supported',
  'terms_custom_order_by_not_supported',
  'terms_rank_metric_not_supported',
]);

export const isTermsEsqlConversionFailureReason = (reason: EsqlConversionFailureReason): boolean =>
  TERMS_FAILURE_REASONS.has(reason);

export const esqlConversionFailureTitle = i18n.translate(
  'xpack.lens.config.cannotConvertToEsqlTitle',
  {
    defaultMessage: 'Cannot convert to ES|QL',
  }
);

/**
 * Full tooltip strings for non-Top-values reasons, and sentence-only bodies for
 * Top values reasons (paired with {@link esqlConversionFailureTitle}).
 */
export const esqlConversionFailureReasonMessages: Record<EsqlConversionFailureReason, string> = {
  formula_not_supported: i18n.translate('xpack.lens.config.cannotConvertToEsqlFormulaTooltip', {
    defaultMessage:
      'Cannot convert to ES|QL: Formula operations will be supported in an upcoming update.',
  }),
  time_shift_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlTimeShiftTooltip',
    {
      defaultMessage:
        'Cannot convert to ES|QL: Time shift will be supported in an upcoming update.',
    }
  ),
  runtime_field_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlRuntimeFieldTooltip',
    {
      defaultMessage:
        'Cannot convert to ES|QL: Runtime fields will be supported in an upcoming update.',
    }
  ),
  reduced_time_range_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlReducedTimeRangeTooltip',
    {
      defaultMessage:
        'Cannot convert to ES|QL: Reduced time range will be supported in an upcoming update.',
    }
  ),
  function_not_supported: i18n.translate('xpack.lens.config.cannotConvertToEsqlOperationTooltip', {
    defaultMessage:
      'Cannot convert to ES|QL: Support for one or more functions used will be coming in an upcoming update.',
  }),
  drop_partials_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlDropPartialsTooltip',
    {
      defaultMessage:
        'Cannot convert to ES|QL: "Drop partial buckets" will be supported in an upcoming update.',
    }
  ),
  include_empty_rows_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlIncludeEmptyRowsTooltip',
    {
      defaultMessage:
        'Cannot convert to ES|QL: "Include empty rows" will be supported in an upcoming update.',
    }
  ),
  terms_date_histogram_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlTermsDateHistogramTooltip',
    {
      defaultMessage:
        'Top values combined with a date histogram will be supported in an upcoming update.',
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
      defaultMessage:
        'Cannot convert to ES|QL: Charts saved to library will be supported in an upcoming update.',
    }
  ),
  query_annotations_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlQueryAnnotationsTooltip',
    {
      defaultMessage:
        'Cannot convert to ES|QL: Query-based annotations will be supported in an upcoming update.',
    }
  ),
  reference_line_not_supported: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlReferenceLineTooltip',
    {
      defaultMessage:
        'Cannot convert to ES|QL: Only static value reference lines are supported for conversion.',
    }
  ),
  trendline_not_supported: i18n.translate('xpack.lens.config.cannotConvertToEsqlTrendlineTooltip', {
    defaultMessage:
      'Cannot convert to ES|QL: The trendline layer uses a configuration that is not yet supported for conversion.',
  }),
  unsupported_settings: i18n.translate(
    'xpack.lens.config.cannotConvertToEsqlUnsupportedSettingsTooltip',
    {
      defaultMessage:
        'Cannot convert to ES|QL: Some settings used will be supported in an upcoming update.',
    }
  ),
  unknown: i18n.translate('xpack.lens.config.cannotConvertToEsqlUnknownTooltip', {
    defaultMessage:
      'Cannot convert to ES|QL: This visualization will be supported in an upcoming update.',
  }),
};

export interface EsqlFailureTooltip {
  title?: string;
  messages: string[];
}

export interface GetFailureTooltipOptions {
  showAllReasons?: boolean;
}

const resolveMessage = (reason: EsqlConversionFailureReason): string =>
  esqlConversionFailureReasonMessages[reason] ??
  esqlConversionFailureReasonMessages.unsupported_settings;

/**
 * Builds tooltip content for a conversion failure. Top values reasons use a shared
 * title plus sentence-only bodies; other reasons keep a single full message.
 * Pass `showAllReasons` to list every blocker; otherwise only the first is shown.
 */
export const getFailureTooltip = (
  reasons: EsqlConversionFailureReason[] | undefined,
  { showAllReasons = false }: GetFailureTooltipOptions = {}
): EsqlFailureTooltip => {
  const allReasons =
    reasons && reasons.length > 0 ? reasons : (['unknown'] as EsqlConversionFailureReason[]);
  const reasonList = showAllReasons ? allReasons : [allReasons[0]];

  if (reasonList.some(isTermsEsqlConversionFailureReason)) {
    return {
      title: esqlConversionFailureTitle,
      messages: reasonList.map(resolveMessage),
    };
  }

  return {
    messages: [resolveMessage(reasonList[0])],
  };
};

/** Plain-text form of {@link getFailureTooltip} for aria-labels and string-only call sites. */
export const getFailureTooltipPlainText = (
  reasons: EsqlConversionFailureReason[] | undefined,
  options?: GetFailureTooltipOptions
): string => {
  const { title, messages } = getFailureTooltip(reasons, options);
  if (!title) {
    return messages[0];
  }
  if (messages.length === 1) {
    return `${title}: ${messages[0]}`;
  }
  return `${title}: ${messages.join(' ')}`;
};
