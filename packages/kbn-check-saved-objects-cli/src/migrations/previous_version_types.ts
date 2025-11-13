/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';

interface GetPreviousVersionTypesParams {
  gitRev: string;
  types: SavedObjectsType<any>[];
}

export async function getPreviousVersionTypes({
  gitRev,
  types,
}: GetPreviousVersionTypesParams): Promise<Array<SavedObjectsType<any>>> {
  // TODO must obtain the previous version mappings from the baseline commit
  return types;
}
