/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export * from './duration';
export * from './duration_distribution_chart';
export * from './http_status_code';
export * from './span_icon';
export * from './timestamp';
export * from './focused_trace_waterfall';
export * from './full_trace_waterfall';
export { WaterfallLegends } from './trace_waterfall/waterfall_legends';
export * from './trace_waterfall/badges';
export * from './trace_waterfall/critical_path';
export * from './truncate_with_tooltip';
export * from './timeline';
export * from './timeline/legend';
export { getSpanIcon } from './span_icon/get_span_icon';
export * from './trace_waterfall/badges';
export * from './trace_waterfall/marks/get_agent_marks';

export type { Margins } from './timeline';
