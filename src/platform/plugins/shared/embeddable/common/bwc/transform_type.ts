/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Prior to 9.4, embeddable type did not matter as long as it was unique
// 9.4 and forward, embeddable type is part of public REST API 
// and needs to be snake and lower cases
// Table containing embeddable types that required a change for public REST API
const LEGACY_TO_AS_CODE_TYPES: { [key: string]: string} = {
  DASHBOARD_MARKDOWN: 'markdown',
  timeSlider: 'time_slider_control',
  rangeSliderControl: 'range_slider_control',
  optionsListControl: 'options_list_control',
  esqlControl: 'esql_control',
  search: 'discover_session',
  LOG_STREAM_EMBEDDABLE: 'log_stream',
  aiopsChangePointChart: 'aiops_change_point_chart',
  aiopsPatternAnalysisEmbeddable: 'aiops_pattern_analysis',
  aiopsLogRateAnalysisEmbeddable: 'aiops_log_rate_analysis',
  APM_ALERTING_LATENCY_CHART_EMBEDDABLE: 'apm_alerting_latency_chart',
  APM_ALERTING_THROUGHPUT_CHART_EMBEDDABLE: 'apm_alerting_throughput_chart',
  APM_ALERTING_FAILED_TRANSACTIONS_CHART_EMBEDDABLE: 'apm_alerting_failed_transactions_chart',
  SLO_EMBEDDABLE: 'slo_overview',
  SLO_ALERTS_EMBEDDABLE: 'slo_alerts',
  SLO_ERROR_BUDGET_EMBEDDABLE: 'slo_error_budget',
  SLO_BURN_RATE_EMBEDDABLE: 'slo_burn_rate',
  SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE: 'synthetics_stats_overview',
  SYNTHETICS_MONITORS_EMBEDDABLE: 'synthetics_monitors',
  //
  // lens gets converted to legacy visualization stored type
  // to avoid name collisions between types,
  // all embeddable types must be converted to stored type when persisting
  //
  lens: 'visualization',
  visualization: 'legacy_visualization',
};

const AS_CODE_TO_LEGACY_TYPES = Object.fromEntries(
  Object.entries(LEGACY_TO_AS_CODE_TYPES).map(([key, value]) => [value, key])
);

// Use on read to convert stored embeddabel type into public REST API embeddable type
export function transformTypeOut(storedType: string) {
  return Object.hasOwn(LEGACY_TO_AS_CODE_TYPES, storedType) ? LEGACY_TO_AS_CODE_TYPES[storedType] : storedType;
}

// Use on write to convert public REST API embeddable type into stored embeddable type
export function transformTypeIn(type: string) {
  return Object.hasOwn(AS_CODE_TO_LEGACY_TYPES, type) ? AS_CODE_TO_LEGACY_TYPES[type] : type;
}
