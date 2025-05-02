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
import { bookAttributesSchema as bookAttributesSchemaV1 } from './book/content_management/schema/v1';
import { bookAttributesSchema as bookAttributesSchemaV2 } from './book/content_management/schema/v2';
import { bookAttributesSchema as bookAttributesSchemaV3 } from './book/content_management/schema/v3';

export class EmbeddableExamplesPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { embeddable }: SetupDeps) {
    const bookCmDefinitionsWithSchemas: EmbeddableContentManagementDefinition = {
      id: 'book',
      versions: {
        1: { ...bookCmDefinitions.versions[1], itemSchema: bookAttributesSchemaV1 },
        2: { ...bookCmDefinitions.versions[2], itemSchema: bookAttributesSchemaV2 },
        3: { ...bookCmDefinitions.versions[3], itemSchema: bookAttributesSchemaV3 },
      },
      latestVersion: 3,
    };

    embeddable.registerEmbeddableContentManagementDefinition(bookCmDefinitionsWithSchemas);

    return {};
  }

  public start(core: CoreStart, { embeddable }: StartDeps) {
    return {};
  }

  public stop() {}
}
