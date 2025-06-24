/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { SetupDeps, StartDeps } from './types';
import { bookTransforms } from '../common/book/content_management/schema/schema';
import { SavedBookAttributes, createBookSavedObjectType } from './book/saved_object';
import { SavedBookStorage } from './book/content_management';
import {
  BOOK_EMBEDDABLE_TYPE,
  BOOK_LATEST_VERSION,
} from '../common/book/content_management/schema';

export class EmbeddableExamplesPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, { contentManagement, embeddable }: SetupDeps) {
    core.savedObjects.registerType<SavedBookAttributes>(createBookSavedObjectType());

    contentManagement.register({
      id: BOOK_EMBEDDABLE_TYPE,
      storage: new SavedBookStorage({
        logger: this.logger.get('storage'),
      }),
      version: {
        latest: BOOK_LATEST_VERSION,
      },
    });

    embeddable.registerTransforms(BOOK_EMBEDDABLE_TYPE, bookTransforms);

    return {};
  }

  public start(core: CoreStart, { embeddable }: StartDeps) {
    return {};
  }

  public stop() {}
}
