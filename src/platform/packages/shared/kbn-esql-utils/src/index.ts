/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { getESQLAdHocDataview, getIndexForESQLQuery } from './utils/get_esql_adhoc_dataview';
export { getInitialESQLQuery } from './utils/get_initial_esql_query';
export { getESQLWithSafeLimit } from './utils/get_esql_with_safe_limit';
export {
  getLimitFromESQLQuery,
  removeDropCommandsFromESQLQuery,
  hasTransformationalCommand,
  getTimeFieldFromESQLQuery,
  prettifyQuery,
  retrieveMetadataColumns,
  getQueryColumnsFromESQLQuery,
  mapVariableToColumn,
  getValuesFromQueryField,
  getESQLQueryVariables,
  fixESQLQueryWithVariables,
  getCategorizeColumns,
  getArgsFromRenameFunction,
  getCategorizeField,
  getKqlSearchQueries,
  getRemoteClustersFromESQLQuery,
  convertTimeseriesCommandToFrom,
  hasDateBreakdown,
  hasOnlySourceCommand,
} from './utils/query_parsing_helpers';
export { getIndexPatternFromESQLQuery } from './utils/get_index_pattern_from_query';
export { queryCannotBeSampled } from './utils/query_cannot_be_sampled';
export { appendToESQLQuery } from './utils/append_to_query/utils';
export { appendStatsByToQuery } from './utils/append_to_query/append_stats_by';
export { appendWhereClauseToESQLQuery } from './utils/append_to_query/append_where';
export { appendLimitToQuery } from './utils/append_to_query/append_limit';

export {
  getESQLQueryColumns,
  getESQLQueryColumnsRaw,
  getESQLResults,
  formatESQLColumns,
  getStartEndParams,
  hasStartEndParams,
  getNamedParams,
} from './utils/run_query';
export {
  isESQLColumnSortable,
  isESQLColumnGroupable,
  isESQLFieldGroupable,
} from './utils/esql_fields_utils';
export { sanitazeESQLInput } from './utils/sanitaze_input';
export { replaceESQLQueryIndexPattern } from './utils/replace_index_pattern';
export { extractCategorizeTokens } from './utils/extract_categorize_tokens';
export { getLookupIndicesFromQuery } from './utils/get_lookup_indices';
export {
  getESQLStatsQueryMeta,
  constructCascadeQuery,
  appendFilteringWhereClauseForCascadeLayout,
} from './utils/cascaded_documents_helpers';
export { getProjectRoutingFromEsqlQuery } from './utils/set_instructions_helpers';
export { isComputedColumn, getQuerySummary } from './utils/get_query_summary';

// Callback functions
export * from './utils/callbacks';
