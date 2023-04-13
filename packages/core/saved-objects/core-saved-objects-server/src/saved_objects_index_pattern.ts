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
export const SavedObjectsIndexPatterns = [
  MAIN_SAVED_OBJECT_INDEX,
  TASK_MANAGER_SAVED_OBJECT_INDEX,
  `${MAIN_SAVED_OBJECT_INDEX}_cases`,
];
