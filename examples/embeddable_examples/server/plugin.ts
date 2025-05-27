/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { EmbeddableContentManagementDefinition } from '@kbn/embeddable-plugin/common';
import type { SetupDeps, StartDeps } from './types';
import { bookCmDefinitions } from '../common/book/content_management/cm_services';
import { bookAttributesSchema } from './book/content_management/schema';

export class EmbeddableExamplesPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { embeddable }: SetupDeps) {
    const bookCmDefinitionsWithSchemas: EmbeddableContentManagementDefinition = {
      id: 'book',
      versions: {
        1: { ...bookCmDefinitions.versions[1], itemSchema: bookAttributesSchema },
      },
      latestVersion: 1,
    };

    embeddable.registerEmbeddableContentManagementDefinition(bookCmDefinitionsWithSchemas);

    return {};
  }

  public start(core: CoreStart, { embeddable }: StartDeps) {
    return {};
  }

  public stop() {}
}
