/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Logger } from '@kbn/core/server';

import { ContentCrud } from './crud';
import { EventBus } from './event_bus';
import { ContentRegistry } from './registry';

export interface CoreApi {
  /**
   * Register a new content in the registry.
   *
   * @param contentType The content type to register
   * @param config The content configuration
   */
  register: ContentRegistry['register'];
  /** Handler to retrieve a content crud instance */
  crud: (contentType: string) => ContentCrud;
  /** Content management event bus */
  eventBus: EventBus;
}

export interface CoreSetup {
  /** Content registry instance */
  contentRegistry: ContentRegistry;
  /** Api exposed to other plugins */
  api: CoreApi;
}

export class Core {
  private contentRegistry: ContentRegistry;
  private eventBus: EventBus;

  constructor({ logger }: { logger: Logger }) {
    const contentTypeValidator = (contentType: string) =>
      this.contentRegistry?.isContentRegistered(contentType) ?? false;
    this.eventBus = new EventBus(contentTypeValidator);
    this.contentRegistry = new ContentRegistry(this.eventBus);
  }

  setup(): CoreSetup {
    return {
      contentRegistry: this.contentRegistry,
      api: {
        register: this.contentRegistry.register.bind(this.contentRegistry),
        crud: this.contentRegistry.getCrud.bind(this.contentRegistry),
        eventBus: this.eventBus,
      },
    };
  }
}
