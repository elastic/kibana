/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger } from '@kbn/core/server';
import { EventStreamService } from '../event_stream';
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
  crud: <T = unknown>(contentType: string) => ContentCrud<T>;
  /** Content management event bus */
  eventBus: EventBus;
}

export interface CoreInitializerContext {
  logger: Logger;
  eventStream?: EventStreamService;
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

  constructor(private readonly ctx: CoreInitializerContext) {
    const contentTypeValidator = (contentType: string) =>
      this.contentRegistry?.isContentRegistered(contentType) ?? false;
    this.eventBus = new EventBus(contentTypeValidator);
    this.contentRegistry = new ContentRegistry(this.eventBus);
  }

  setup(): CoreSetup {
    this.setupEventStream();

    return {
      contentRegistry: this.contentRegistry,
      api: {
        register: this.contentRegistry.register.bind(this.contentRegistry),
        crud: this.contentRegistry.getCrud.bind(this.contentRegistry),
        eventBus: this.eventBus,
      },
    };
  }

  private setupEventStream() {
    const eventStream = this.ctx.eventStream;

    // TODO: This should be cleaned up and support added for all CRUD events.
    // The work is tracked here: https://github.com/elastic/kibana/issues/153258
    // and here: https://github.com/elastic/kibana/issues/153260
    if (eventStream) {
      this.eventBus.on('deleteItemSuccess', (event) => {
        eventStream.addEvent({
          // TODO: add "subject" field to event
          predicate: ['delete'],
          // TODO: the `.contentId` should be easily available on most events.
          object: [event.contentTypeId, (event as any).contentId],
        });
      });
    }
  }
}
