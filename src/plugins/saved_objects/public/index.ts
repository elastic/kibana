/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { SavedObjectsPublicPlugin } from './plugin';

export { LISTING_LIMIT_SETTING, PER_PAGE_SETTING } from '../common';
export {
  getSavedObjectFinder,
  SavedObjectFinderUi,
  SavedObjectFinderUiProps,
  SavedObjectMetaData,
} from './finder';
export { SavedObjectSetup, SavedObjectsStart } from './plugin';
export {
  checkForDuplicateTitle,
  isErrorNonFatal,
  SavedObjectDecorator,
  SavedObjectDecoratorConfig,
  SavedObjectDecoratorFactory,
  SavedObjectLoader,
  SavedObjectLoaderFindOptions,
  saveWithConfirmation,
} from './saved_object';
export {
  OnSaveProps,
  OriginSaveModalProps,
  SavedObjectSaveModal,
  SavedObjectSaveModalOrigin,
  SaveModalState,
  SaveResult,
  showSaveModal,
} from './save_modal';
export { SavedObject, SavedObjectConfig, SavedObjectSaveOpts } from './types';

export const plugin = () => new SavedObjectsPublicPlugin();
