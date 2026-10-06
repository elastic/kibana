/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObject } from '@kbn/core-saved-objects-common';
import type { SavedObjectsExportTransform } from '@kbn/core-saved-objects-server';
import { type SavedObjectComparator } from './utils';
interface ApplyExportTransformsOptions {
  objects: SavedObject[];
  request: KibanaRequest;
  transforms: Map<string, SavedObjectsExportTransform>;
  sortFunction?: SavedObjectComparator;
}
export declare const applyExportTransforms: ({
  objects,
  request,
  transforms,
  sortFunction,
}: ApplyExportTransformsOptions) => Promise<SavedObject[]>;
export {};
