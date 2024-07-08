/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
} from './utils/query_parsing_helpers';
export { appendToESQLQuery, appendWhereClauseToESQLQuery } from './utils/append_to_query';
export { getESQLQueryColumns, getESQLQueryColumnsRaw, getESQLResults } from './utils/run_query';
