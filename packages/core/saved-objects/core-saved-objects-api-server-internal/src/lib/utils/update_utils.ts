/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';

/**
 * Downward compatible update control flow helpers
 * unused ATM
 */
export const updateProgressData: Record<string, unknown> = {
  unmigratedRawDoc: {},
  migratedOriginalSODoc: {},
  updatedNewSODoc: {},
  safeToSendUpdatedNewSODoc: {},
  updateResult: {},
  retriesCount: 0,
  safeToSendCreateUpsertedSODoc: {},
  createdResult: {},
  finalResponse: {},
};

export const isValidRequest = ({
  allowedTypes,
  type,
  id,
}: {
  allowedTypes: string[];
  type: string;
  id?: string;
}) => {
  return !id
    ? {
        validRequest: false,
        error: SavedObjectsErrorHelpers.createBadRequestError('id cannot be empty'),
      }
    : !allowedTypes.includes(type)
    ? {
        validRequest: false,
        error: SavedObjectsErrorHelpers.createGenericNotFoundError(type, id),
      }
    : {
        validRequest: true,
      };
};
