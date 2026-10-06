/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type {
  SavedObjectsFindResponse,
  SavedObjectsCreatePointInTimeFinderDependencies,
  SavedObjectsCreatePointInTimeFinderOptions,
  ISavedObjectsPointInTimeFinder,
  SavedObjectsFindInternalOptions,
} from '@kbn/core-saved-objects-api-server';
/**
 * @internal
 */
export interface PointInTimeFinderDependencies
  extends SavedObjectsCreatePointInTimeFinderDependencies {
  logger: Logger;
  internalOptions?: SavedObjectsFindInternalOptions;
}
/**
 * @internal
 */
export type CreatePointInTimeFinderFn = <T = unknown, A = unknown>(
  findOptions: SavedObjectsCreatePointInTimeFinderOptions,
  dependencies?: SavedObjectsCreatePointInTimeFinderDependencies,
  internalOptions?: SavedObjectsFindInternalOptions
) => ISavedObjectsPointInTimeFinder<T, A>;
/**
 * @internal
 */
export declare class PointInTimeFinder<T = unknown, A = unknown>
  implements ISavedObjectsPointInTimeFinder<T, A>
{
  #private;
  constructor(
    findOptions: SavedObjectsCreatePointInTimeFinderOptions,
    { logger, client, internalOptions }: PointInTimeFinderDependencies
  );
  find(): AsyncGenerator<SavedObjectsFindResponse<T, A>, void, unknown>;
  close(): Promise<void>;
  private open;
  private findNext;
  private getLastHitSortValue;
}
