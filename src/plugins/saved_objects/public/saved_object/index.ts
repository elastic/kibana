/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export { createSavedObjectClass } from './saved_object';
export { SavedObjectLoader, SavedObjectLoaderFindOptions } from './saved_object_loader';
export { checkForDuplicateTitle } from './helpers/check_for_duplicate_title';
export { saveWithConfirmation } from './helpers/save_with_confirmation';
export { isErrorNonFatal } from './helpers/save_saved_object';
export {
  SavedObjectDecoratorRegistry,
  SavedObjectDecoratorFactory,
  SavedObjectDecorator,
  SavedObjectDecoratorConfig,
} from './decorators';
