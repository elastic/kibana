/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger } from '@kbn/core/server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { Version } from '@kbn/object-versioning';

import { getContentClientFactory, IContentClient } from '../content_client';
import { EventStreamService } from '../event_stream';
import { ContentCrud } from './crud';
import { EventBus } from './event_bus';
import { ContentRegistry } from './registry';

export interface GetContentClientForRequestDependencies {
  contentTypeId: string;
  requestHandlerContext: RequestHandlerContext;
  version?: Version;
}

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
  contentClient: {
    getForRequest(deps: GetContentClientForRequestDependencies): IContentClient;
  };
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

    const coreApi: CoreApi = {
      register: this.contentRegistry.register.bind(this.contentRegistry),
      crud: this.contentRegistry.getCrud.bind(this.contentRegistry),
      eventBus: this.eventBus,
      contentClient: {
        getForRequest: ({ contentTypeId, requestHandlerContext, version }) => {
          const contentDefinition = this.contentRegistry.getDefinition(contentTypeId);
          const clientFactory = getContentClientFactory({ contentRegistry: this.contentRegistry });
          const contentClient = clientFactory(contentTypeId);

          return contentClient.getForRequest({
            requestHandlerContext,
            version: version ?? contentDefinition.version.latest,
          });
        },
      },
    };

    return {
      contentRegistry: this.contentRegistry,
      api: coreApi,
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
