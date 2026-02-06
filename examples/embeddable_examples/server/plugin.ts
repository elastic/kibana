/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { SetupDeps, StartDeps } from './types';
import { registerBookSavedObject, BookStorage } from './book';
import { BOOK_CONTENT_ID, BOOK_EMBEDDABLE_TYPE, BOOK_LATEST_VERSION } from '../common';
import { bookTransforms } from '../common/book/transforms';

export class EmbeddableExamplesPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, { contentManagement, embeddable }: SetupDeps) {
    registerBookSavedObject(core);

    contentManagement.register({
      id: BOOK_CONTENT_ID,
      storage: new BookStorage({
        logger: this.logger.get('storage'),
      }),
      version: {
        latest: BOOK_LATEST_VERSION,
      },
    });

    embeddable.registerTransforms(BOOK_EMBEDDABLE_TYPE, {
      getTransforms: () => bookTransforms,
    });

    return {};
  }

  public start(core: CoreStart, { embeddable }: StartDeps) {
    return {};
  }

  public stop() {}
}
