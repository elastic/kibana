/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
export interface FindSampleObjectsParams {
  client: SavedObjectsClientContract;
  logger: Logger;
  objects: SampleObject[];
}
export interface SampleObject {
  type: string;
  id: string;
}
export interface FindSampleObjectsResponseObject {
  type: string;
  id: string;
  /** Contains a string if this sample data object was found, or undefined if it was not. */
  foundObjectId: string | undefined;
}
/**
 * Given an array of objects in a sample dataset, this function attempts to find if those objects exist in the current space.
 * It attempts to find objects with an origin of the sample data (e.g., matching `id` or `originId`).
 */
export declare function findSampleObjects({
  client,
  logger,
  objects,
}: FindSampleObjectsParams): Promise<FindSampleObjectsResponseObject[]>;
