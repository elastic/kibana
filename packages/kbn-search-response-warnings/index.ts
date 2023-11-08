/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { SearchResponseWarning, WarningHandlerCallback } from './src/types';

export {
  SearchResponseWarningsBadge,
  SearchResponseWarningsBadgePopoverContent,
  SearchResponseWarningsCallout,
  SearchResponseWarningsEmptyPrompt,
} from './src/components/search_response_warnings';

export { handleWarnings } from './src/handle_warnings';
export { hasUnsupportedDownsampledAggregationFailure } from './src/has_unsupported_downsampled_aggregation_failure';
