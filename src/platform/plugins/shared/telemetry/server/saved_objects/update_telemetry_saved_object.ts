/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectsErrorHelpers, SavedObjectsClientContract } from '@kbn/core/server';
import { TELEMETRY_SAVED_OBJECT_TYPE, TELEMETRY_SAVED_OBJECT_ID } from './constants';
import type { TelemetrySavedObjectAttributes } from './types';

export async function updateTelemetrySavedObject(
  savedObjectsClient: SavedObjectsClientContract,
  savedObjectAttributes: TelemetrySavedObjectAttributes
) {
  try {
    return await savedObjectsClient.update(
      TELEMETRY_SAVED_OBJECT_TYPE,
      TELEMETRY_SAVED_OBJECT_ID,
      savedObjectAttributes
    );
  } catch (err) {
    if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
      return await savedObjectsClient.create(TELEMETRY_SAVED_OBJECT_TYPE, savedObjectAttributes, {
        id: TELEMETRY_SAVED_OBJECT_ID,
        overwrite: true,
      });
    }
    throw err;
  }
}
