/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublishingSubject, useStateFromPublishingSubject } from '../publishing_subject';

export interface PublishesUniqueId {
  uuid: PublishingSubject<string>;
}

export const apiPublishesUniqueId = (
  unknownApi: null | unknown
): unknownApi is PublishesUniqueId => {
  return Boolean(unknownApi && (unknownApi as PublishesUniqueId)?.uuid !== undefined);
};

/**
 * Gets this API's UUID as a reactive variable which will cause re-renders on change.
 */
export const useUniqueId = <
  ApiType extends Partial<PublishesUniqueId> = Partial<PublishesUniqueId>
>(
  api: ApiType
) =>
  useStateFromPublishingSubject<string, ApiType['uuid']>(
    apiPublishesUniqueId(api) ? api.uuid : undefined
  );
