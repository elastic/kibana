/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface HasParentApi<ParentApiType extends unknown = unknown> {
  parentApi: ParentApiType;
}

/**
 * A type guard which checks whether or not a given API has a parent API.
 */
export const apiHasParentApi = (unknownApi: null | unknown): unknownApi is HasParentApi => {
  return Boolean(unknownApi && (unknownApi as HasParentApi)?.parentApi !== undefined);
};
