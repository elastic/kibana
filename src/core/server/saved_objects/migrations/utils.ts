/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mergeWith } from 'lodash';
import {
  SavedObjectMigrationContext,
  SavedObjectMigrationFn,
  SavedObjectMigrationMap,
  SavedObjectUnsanitizedDoc,
} from '../..';

/**
 * Merges two saved object migration maps.
 * @public
 */
export const mergeSavedObjectMigrationMaps = (
  map1: SavedObjectMigrationMap,
  map2: SavedObjectMigrationMap
): SavedObjectMigrationMap => {
  const customizer = (objValue: SavedObjectMigrationFn, srcValue: SavedObjectMigrationFn) => {
    if (!srcValue || !objValue) {
      return srcValue || objValue;
    }
    return (state: SavedObjectUnsanitizedDoc, context: SavedObjectMigrationContext) =>
      objValue(srcValue(state, context), context);
  };

  return mergeWith({ ...map1 }, map2, customizer);
};
