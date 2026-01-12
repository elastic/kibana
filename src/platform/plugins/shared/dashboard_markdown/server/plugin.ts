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
import { MARKDOWN_EMBEDDABLE_TYPE } from '../common/constants';
import type { SetupDeps, StartDeps } from './types';
import { markdownEmbeddableSchema } from './schemas';
import type { MarkdownState } from '.';
import { markdownSavedObjectType } from './markdown_saved_object';
import { MarkdownStorage } from './content_management/markdown_storage';

export class MarkdownPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  setup(core: CoreSetup<StartDeps>, plugins: SetupDeps) {
    plugins.embeddable.registerTransforms(MARKDOWN_EMBEDDABLE_TYPE, {
      schema: markdownEmbeddableSchema,
    });

    plugins.contentManagement.register({
      id: MARKDOWN_EMBEDDABLE_TYPE,
      storage: new MarkdownStorage(),
      version: { latest: 1 },
    });

    core.savedObjects.registerType<MarkdownState>(markdownSavedObjectType);

    registerRoutes(core.http);
  }

  start(core: CoreStart, plugins: StartDeps) {}
}
