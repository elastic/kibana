/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublishingSubject, useStateFromPublishingSubject } from '../publishing_subject';

export interface PublishesParentApi<ParentApiType extends unknown = unknown> {
  parentApi: PublishingSubject<ParentApiType>;
}

type UnwrapParent<ApiType extends unknown> = ApiType extends PublishesParentApi<infer ParentType>
  ? ParentType
  : unknown;

/**
 * A type guard which checks whether or not a given API publishes its parent API.
 */
export const apiPublishesParentApi = (
  unknownApi: null | unknown
): unknownApi is PublishesParentApi => {
  return Boolean(unknownApi && (unknownApi as PublishesParentApi)?.parentApi !== undefined);
};

export const useParentApi = <
  ApiType extends Partial<PublishesParentApi> = Partial<PublishesParentApi>
>(
  api: ApiType
): UnwrapParent<ApiType> =>
  useStateFromPublishingSubject<unknown, ApiType['parentApi']>(
    apiPublishesParentApi(api) ? api.parentApi : undefined
  ) as UnwrapParent<ApiType>;
