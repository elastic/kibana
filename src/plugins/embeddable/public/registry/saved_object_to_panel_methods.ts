/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';

type SavedObjectToPanelMethod = (savedObject: SavedObjectCommon) => any;

export const savedObjectToPanel: Record<string, SavedObjectToPanelMethod> = {};

export const registerSavedObjectToPanelMethod = (
  savedObjectType: string,
  method: SavedObjectToPanelMethod
) => {
  savedObjectToPanel[savedObjectType] = method;
};
