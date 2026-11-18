/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Browser-only entry point: everything here depends on React and/or EUI.
// Keep it out of `@kbn/discover-utils` so server code never loads these libraries.

export {
  createDegradedDocsControl,
  createStacktraceControl,
} from '../src/components/custom_control_columns';
export { ErrorCallout, type ErrorCalloutProps } from '../src/components/error_callout';
export { LogLevelBadge } from '../src/data_types/logs/components';
export { getLogLevelColor } from '../src/data_types/logs/utils/get_log_level_color';
export { usePager } from '../src/hooks';
export { formatHitReact } from '../src/utils/format_hit';
export {
  formatFieldValueReact,
  formatFieldStringValueWithHighlights,
  type FormatFieldValueReactParams,
  type FormatFieldStringWithHighlightsParams,
} from '../src/utils/format_value_react';
