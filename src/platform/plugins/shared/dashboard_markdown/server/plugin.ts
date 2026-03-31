/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';

import { registerRoutes } from './api/register_routes';
import { MARKDOWN_EMBEDDABLE_TYPE, MARKDOWN_SAVED_OBJECT_TYPE } from '../common/constants';
import { markdownEmbeddableSchema } from './schemas';
import type { MarkdownAttributes } from './markdown_saved_object';
import { markdownSavedObjectType } from './markdown_saved_object';
import { MarkdownStorage } from './content_management';
import type { SetupDeps, StartDeps } from './types';
import { getTransforms } from './embeddable';

export class MarkdownPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  setup(core: CoreSetup<StartDeps>, plugins: SetupDeps) {
    plugins.embeddable.registerTransforms(MARKDOWN_EMBEDDABLE_TYPE, {
      getSchema: () => markdownEmbeddableSchema,
      getTransforms,
    });

    // Registering the markdown saved object type with content management
    // to support "Add from library" flyout in dashboard
    // Only 'mSearch' implemented to support markdown saved objects in 'api/content_management/rpc/mSearch' route
    // CRUD content management routes not implemented and throw
    plugins.contentManagement.register({
      id: MARKDOWN_SAVED_OBJECT_TYPE,
      storage: new MarkdownStorage(),
      version: { latest: 1 },
    });

    core.savedObjects.registerType<MarkdownAttributes>(markdownSavedObjectType);

    registerRoutes(core.http);
  }

  start(core: CoreStart, plugins: StartDeps) {}
}
