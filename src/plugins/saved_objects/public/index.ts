/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObjectsPublicPlugin } from './plugin';

export {
  OnSaveProps,
  SavedObjectSaveModal,
  SavedObjectSaveModalOrigin,
  OriginSaveModalProps,
  SaveModalState,
  SaveResult,
  showSaveModal,
} from './save_modal';
export { getSavedObjectFinder, SavedObjectFinderUi, SavedObjectMetaData } from './finder';
export {
  SavedObjectLoader,
  SavedObjectLoaderFindOptions,
  checkForDuplicateTitle,
  saveWithConfirmation,
  isErrorNonFatal,
  SavedObjectDecorator,
  SavedObjectDecoratorFactory,
  SavedObjectDecoratorConfig,
} from './saved_object';
export { SavedObjectSaveOpts, SavedObject, SavedObjectConfig } from './types';
export { PER_PAGE_SETTING, LISTING_LIMIT_SETTING } from '../common';
export { SavedObjectsStart, SavedObjectSetup } from './plugin';

export const plugin = () => new SavedObjectsPublicPlugin();
