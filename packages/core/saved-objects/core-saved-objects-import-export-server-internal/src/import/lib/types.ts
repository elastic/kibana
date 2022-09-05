/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * This map contains entries for objects that are included in the import operation. The entry key is the object's `type:id`, and the entry
 * value contains optional attributes which change how that object is created. The initial map that is created by the collectSavedObjects
 * module contains one entry with an empty value for each object that is being imported.
 *
 * This map is meant to function as a sort of accumulator; each module that is called during the import process can emit new entries that
 * will override those from the initial map.
 */
export type ImportStateMap = Map<string, ImportStateValue>;

/**
 * The value of an import state entry, which contains optional attributes that change how the object is created.
 */
export interface ImportStateValue {
  /**
   * This attribute indicates that the object for this entry is *only* a reference, it does not exist in the import file.
   */
  isOnlyReference?: boolean;
  /**
   * This attribute indicates that the object should have this ID instead of what was specified in the import file.
   */
  destinationId?: string;
  /**
   * This attribute indicates that the object's originId should be cleared.
   */
  omitOriginId?: boolean;
}
