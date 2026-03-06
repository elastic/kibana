/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';

/**
 * Characters that are forbidden in user-provided saved object IDs.
 * Forward slashes can enable path traversal attacks in Elasticsearch REST API URLs.
 */
export const FORBIDDEN_ID_CHARS = ['/'] as const;

/**
 * Throws a BadRequestError if the given ID contains any character that could enable
 * path traversal attacks against the Elasticsearch REST API.
 *
 * Must be called for all user-provided saved object IDs before they are used in ES requests.
 * Non-string IDs (e.g. undefined passed despite the type contract) are skipped; other
 * validators or Elasticsearch itself will handle those.
 */
export const assertValidId = (id: string): void => {
  if (typeof id !== 'string') {
    return;
  }
  const forbidden = FORBIDDEN_ID_CHARS.filter((char) => id.includes(char));
  if (forbidden.length > 0) {
    throw SavedObjectsErrorHelpers.createBadRequestError(
      `Invalid saved object ID: IDs cannot contain '${FORBIDDEN_ID_CHARS.join("', '")}'.`
    );
  }
};
