/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsPublicPlugin } from './plugin';

export type { OnSaveProps, OriginSaveModalProps, SaveModalState, SaveResult } from './save_modal';
export { SavedObjectSaveModal, SavedObjectSaveModalOrigin, showSaveModal } from './save_modal';
export type { SavedObjectFinderUiProps, SavedObjectMetaData } from './finder';
export { getSavedObjectFinder, SavedObjectFinderUi } from './finder';
export type {
  SavedObjectDecorator,
  SavedObjectDecoratorFactory,
  SavedObjectDecoratorConfig,
} from './saved_object';
export { checkForDuplicateTitle, saveWithConfirmation, isErrorNonFatal } from './saved_object';
export type { SavedObjectSaveOpts, SavedObject, SavedObjectConfig } from './types';
export { PER_PAGE_SETTING, LISTING_LIMIT_SETTING } from '../common';
export type { SavedObjectsStart, SavedObjectSetup } from './plugin';

export const plugin = () => new SavedObjectsPublicPlugin();
