/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger, SavedObjectsServiceStart } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';

const SPACE_SAVED_OBJECT_TYPE = 'space';

/**
 * Returns true only when the space saved object is confirmed missing; lookup failures return false.
 * Callers must only use this when the spaces plugin is enabled, since the `space` type is registered there.
 */
export const isSpaceDeleted = async (
  savedObjects: SavedObjectsServiceStart,
  spaceId: string,
  logger: Logger
): Promise<boolean> => {
  if (spaceId === DEFAULT_SPACE_ID || spaceId === GLOBAL_WORKFLOW_SPACE_ID) {
    return false;
  }
  try {
    await savedObjects
      .createInternalRepository([SPACE_SAVED_OBJECT_TYPE])
      .get(SPACE_SAVED_OBJECT_TYPE, spaceId);
    return false;
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return true;
    }
    logger.debug(
      `Failed to check whether space ${spaceId} exists: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return false;
  }
};
