/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Collect and centralize the names of the different saved object indices.
 * Note that all of them start with the '.kibana' prefix.
 * There are multiple places in the code that these indices have the form .kibana*.
 * However, beware that there are some system indices that have the same prefix
 * but are NOT used to store saved objects, e.g.: .kibana_security_session_1
 */
export const MAIN_SAVED_OBJECT_INDEX = '.kibana';
export const TASK_MANAGER_SAVED_OBJECT_INDEX = `${MAIN_SAVED_OBJECT_INDEX}_task_manager`;
export const INGEST_SAVED_OBJECT_INDEX = `${MAIN_SAVED_OBJECT_INDEX}_ingest`;
export const ALERTING_CASES_SAVED_OBJECT_INDEX = `${MAIN_SAVED_OBJECT_INDEX}_alerting_cases`;
export const SECURITY_SOLUTION_SAVED_OBJECT_INDEX = `${MAIN_SAVED_OBJECT_INDEX}_security_solution`;
export const ANALYTICS_SAVED_OBJECT_INDEX = `${MAIN_SAVED_OBJECT_INDEX}_analytics`;
export const USAGE_COUNTERS_SAVED_OBJECT_INDEX = `${MAIN_SAVED_OBJECT_INDEX}_usage_counters`;

export const ALL_SAVED_OBJECT_INDICES = [
  MAIN_SAVED_OBJECT_INDEX,
  TASK_MANAGER_SAVED_OBJECT_INDEX,
  ALERTING_CASES_SAVED_OBJECT_INDEX,
  INGEST_SAVED_OBJECT_INDEX,
  SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  ANALYTICS_SAVED_OBJECT_INDEX,
  USAGE_COUNTERS_SAVED_OBJECT_INDEX,
];
