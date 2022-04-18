/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsErrorHelpers, SavedObjectsClientContract } from '@kbn/core/server';
import { TelemetrySavedObject } from '.';

type GetTelemetrySavedObject = (
  repository: SavedObjectsClientContract
) => Promise<TelemetrySavedObject>;

export const getTelemetrySavedObject: GetTelemetrySavedObject = async (
  repository: SavedObjectsClientContract
) => {
  try {
    const { attributes } = await repository.get<TelemetrySavedObject>('telemetry', 'telemetry');
    return attributes;
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return null;
    }

    // if we aren't allowed to get the telemetry document, we can assume that we won't
    // be able to opt into telemetry either, so we're returning `false` here instead of null
    if (SavedObjectsErrorHelpers.isForbiddenError(error)) {
      return false;
    }

    throw error;
  }
};
