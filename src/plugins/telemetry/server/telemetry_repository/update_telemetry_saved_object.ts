/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsErrorHelpers, SavedObjectsClientContract } from '@kbn/core/server';
import { TelemetrySavedObjectAttributes } from '.';

export async function updateTelemetrySavedObject(
  savedObjectsClient: SavedObjectsClientContract,
  savedObjectAttributes: TelemetrySavedObjectAttributes
) {
  try {
    return await savedObjectsClient.update('telemetry', 'telemetry', savedObjectAttributes);
  } catch (err) {
    if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
      return await savedObjectsClient.create('telemetry', savedObjectAttributes, {
        id: 'telemetry',
        overwrite: true,
      });
    }
    throw err;
  }
}
