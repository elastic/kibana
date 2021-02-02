/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObjectLoader } from '../../../saved_objects/public';
import { createSavedSheetClass } from './_saved_sheet';
import { RenderDeps } from '../application';

export function initSavedSheetService(app: angular.IModule, deps: RenderDeps) {
  const savedObjectsClient = deps.core.savedObjects.client;
  const SavedSheet = createSavedSheetClass(deps.plugins.savedObjects, deps.core.uiSettings);

  const savedSheetLoader = new SavedObjectLoader(SavedSheet, savedObjectsClient);
  savedSheetLoader.urlFor = (id) => `#/${encodeURIComponent(id)}`;
  // Customize loader properties since adding an 's' on type doesn't work for type 'timelion-sheet'.
  savedSheetLoader.loaderProperties = {
    name: 'timelion-sheet',
    noun: 'Saved Sheets',
    nouns: 'saved sheets',
  };
  // This is the only thing that gets injected into controllers
  app.service('savedSheets', function () {
    return savedSheetLoader;
  });

  return savedSheetLoader;
}
