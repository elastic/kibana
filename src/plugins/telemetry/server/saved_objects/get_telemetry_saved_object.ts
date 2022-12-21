/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-utils-server';
import type { TelemetrySavedObject } from './types';
import { TELEMETRY_SAVED_OBJECT_TYPE, TELEMETRY_SAVED_OBJECT_ID } from './constants';

type GetTelemetrySavedObject = (
  soClient: SavedObjectsClientContract
) => Promise<TelemetrySavedObject>;

export const getTelemetrySavedObject: GetTelemetrySavedObject = async (
  soClient: SavedObjectsClientContract
) => {
  try {
    const { attributes } = await soClient.get<TelemetrySavedObject>(
      TELEMETRY_SAVED_OBJECT_TYPE,
      TELEMETRY_SAVED_OBJECT_ID
    );
    return attributes;
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return {};
    }

    throw error;
  }
};
