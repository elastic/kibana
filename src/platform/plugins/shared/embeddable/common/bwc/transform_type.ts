/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function transformType(type: string) {
  if (type === 'DASHBOARD_MARKDOWN') {
    return 'markdown';
  }

  if (type === 'timeSlider') {
    return 'time_slider_control';
  }

  if (type === 'rangeSliderControl') {
    return 'range_slider_control';
  }

  if (type === 'optionsListControl') {
    return 'options_list_control';
  }

  if (type === 'esqlControl') {
    return 'esql_control';
  }

  if (type === 'search') {
    return 'discover_session';
  }

  if (type === 'LOG_STREAM_EMBEDDABLE') {
    return 'log_stream';
  }

  if (type === 'aiopsChangePointChart') {
    return 'aiops_change_point_chart';
  }

  if (type === 'aiopsPatternAnalysisEmbeddable') {
    return 'aiops_pattern_analysis';
  }

  if (type === 'aiopsLogRateAnalysisEmbeddable') {
    return 'aiops_log_rate_analysis';
  }

  if (type === 'APM_ALERTING_LATENCY_CHART_EMBEDDABLE') {
    return 'apm_alerting_latency_chart';
  }

  if (type === 'APM_ALERTING_THROUGHPUT_CHART_EMBEDDABLE') {
    return 'apm_alerting_throughput_chart';
  }

  if (type === 'APM_ALERTING_FAILED_TRANSACTIONS_CHART_EMBEDDABLE') {
    return 'apm_alerting_failed_transactions_chart';
  }

  if (type === 'SLO_EMBEDDABLE') {
    return 'slo';
  }

  if (type === 'SLO_ALERTS_EMBEDDABLE') {
    return 'slo_alerts';
  }

  if (type === 'SLO_ERROR_BUDGET_EMBEDDABLE') {
    return 'slo_error_budget';
  }

  if (type === 'SLO_BURN_RATE_EMBEDDABLE') {
    return 'slo_burn_rate';
  }

  if (type === 'SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE') {
    return 'synthetics_stats_overview';
  }

  if (type === 'SYNTHETICS_MONITORS_EMBEDDABLE') {
    return 'synthetics_monitors';
  }

  return type;
}
