/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { isFoundGetResponse, type GetResponseFound } from './es_responses';
export { findSharedOriginObjects } from './find_shared_origin_objects';
export {
  rawDocExistsInNamespace,
  errorContent,
  rawDocExistsInNamespaces,
  isMgetDoc,
  getCurrentTime,
  getBulkOperationError,
  getExpectedVersionProperties,
  getSavedObjectFromSource,
  setManaged,
  normalizeNamespace,
  getSavedObjectNamespaces,
  type GetSavedObjectFromSourceOptions,
} from './internal_utils';
export { type Left, type Either, type Right, isLeft, isRight, left, right } from './either';
export { mergeForUpdate } from './merge_for_update';
