/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublishingSubject } from '../publishing_subject';

export interface PublishesDisabledActionIds {
  disabledActionIds: PublishingSubject<string[] | undefined>;
  getAllTriggersDisabled?: () => boolean;
}

/**
 * A type guard which checks whether or not a given API publishes Disabled Action IDs.  This can be used
 * to programatically limit which actions are available on a per-API basis.
 */
export const apiPublishesDisabledActionIds = (
  unknownApi: null | unknown
): unknownApi is PublishesDisabledActionIds => {
  return Boolean(
    unknownApi && (unknownApi as PublishesDisabledActionIds)?.disabledActionIds !== undefined
  );
};
