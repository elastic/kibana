/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublishingSubject, useStateFromPublishingSubject } from '../publishing_subject';

/**
 * This API publishes a saved object id which can be used to determine which saved object this API is linked to.
 */
export interface PublishesSavedObjectId {
  savedObjectId: PublishingSubject<string | undefined>;
}

/**
 * A type guard which can be used to determine if a given API publishes a saved object id.
 */
export const apiPublishesSavedObjectId = (
  unknownApi: null | unknown
): unknownApi is PublishesSavedObjectId => {
  return Boolean(unknownApi && (unknownApi as PublishesSavedObjectId)?.savedObjectId !== undefined);
};

/**
 * A hook that gets this API's saved object ID as a reactive variable which will cause re-renders on change.
 */
export const useSavedObjectId = (api: PublishesSavedObjectId | undefined) =>
  useStateFromPublishingSubject<string | undefined>(api?.savedObjectId);
