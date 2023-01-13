/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Logger, ElasticsearchClient } from '@kbn/core/server';

import type { Content } from '../../common';
import { schemas } from '../../common';
import { ContentCrud } from './crud';
import { EventBus } from './event_bus';
import { ContentRegistry } from './registry';
import { ContentSearchIndex } from './search';

export interface ContentCoreApi {
  register: ContentRegistry['register'];
  crud: (contentType: string) => ContentCrud;
  eventBus: EventBus;
  searchIndexer: ContentSearchIndex;
}

export class ContentCore {
  private contentRegistry: ContentRegistry;
  private eventBus: EventBus;
  private searchIndex: ContentSearchIndex;

  constructor({ logger }: { logger: Logger }) {
    this.contentRegistry = new ContentRegistry();
    this.eventBus = new EventBus();
    this.searchIndex = new ContentSearchIndex({ logger });
  }

  setup(): ContentCoreApi {
    const crud = (contentType: string) => {
      return new ContentCrud(contentType, {
        contentRegistry: this.contentRegistry,
        eventBus: this.eventBus,
      });
    };

    this.eventBus.events$.subscribe((event) => {
      if (event.type === 'createItemSuccess') {
        // Index the data
        // console.log('>>>>>>> Content created.');
        // console.log(JSON.stringify(event.data));
        const serializer = this.contentRegistry.getConfig(
          event.contentType
        )?.toKibanaContentSerializer;

        const content = serializer ? serializer(event.data) : (event.data as Content);
        const { error } = schemas.content.searchIndex.getSchema().validate(content);

        if (error) {
          throw new Error(`Can't index content [${event.contentType}] created, invalid Content.`);
        }

        this.searchIndex.index(content);
      }
    });

    return {
      register: this.contentRegistry.register.bind(this.contentRegistry),
      crud,
      eventBus: this.eventBus,
      searchIndexer: this.searchIndex,
    };
  }

  start({ esClient }: { esClient: ElasticsearchClient }) {
    this.searchIndex.start({ esClient });
  }
}
