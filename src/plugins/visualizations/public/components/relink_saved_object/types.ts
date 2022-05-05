/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  IUiSettingsClient,
  SavedObjectAttributes,
  SavedObjectsStart,
  SimpleSavedObject,
} from '@kbn/core/public';

/** @public **/
export interface RelinkSavedObjectMeta {
  id: string;
  type: string;
  name?: string;
}

/** @public **/
export type RelinkCallback = (missedSavedObjectId: string, selectedSavedObjectId: string) => void;

/** @internal **/
export type RelinkSimpleSavedObject = SimpleSavedObject<SavedObjectAttributes>;

/** @internal **/
export interface RelinkSimpleSavedDeps {
  savedObjects: SavedObjectsStart;
  uiSettings: IUiSettingsClient;
}
