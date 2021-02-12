/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject } from '../../types';
import { SavedObjectsImportRetry } from '../types';

export function createObjectsFilter(retries: SavedObjectsImportRetry[]) {
  const retryKeys = new Set<string>(retries.map((retry) => `${retry.type}:${retry.id}`));
  return (obj: SavedObject) => {
    return retryKeys.has(`${obj.type}:${obj.id}`);
  };
}
