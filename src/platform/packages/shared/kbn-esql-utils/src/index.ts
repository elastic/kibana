/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { TextBasedLanguages } from './types';
export { getESQLAdHocDataview, getIndexForESQLQuery } from './utils/get_esql_adhoc_dataview';
export { getInitialESQLQuery } from './utils/get_initial_esql_query';
export { getESQLWithSafeLimit } from './utils/get_esql_with_safe_limit';
export {
  getIndexPatternFromESQLQuery,
  getLimitFromESQLQuery,
  removeDropCommandsFromESQLQuery,
  hasTransformationalCommand,
  getTimeFieldFromESQLQuery,
  prettifyQuery,
  isQueryWrappedByPipes,
  retrieveMetadataColumns,
  getQueryColumnsFromESQLQuery,
  mapVariableToColumn,
  getValuesFromQueryField,
  getESQLQueryVariables,
} from './utils/query_parsing_helpers';
export { queryCannotBeSampled } from './utils/query_cannot_be_sampled';
export {
  appendToESQLQuery,
  appendWhereClauseToESQLQuery,
  appendStatsByToQuery,
} from './utils/append_to_query';
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
