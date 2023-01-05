/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ContentStorage } from './content_storage';
import { ContentCrud } from './crud';
import { EventBus } from './event_bus';
import { ContentRegistry } from './registry';

export class ContentCore {
  private contentRegistry: ContentRegistry;
  private eventBus: EventBus;

  constructor() {
    this.contentRegistry = new ContentRegistry();
    this.eventBus = new EventBus();
  }

  setup() {}

  start() {
    const crud = <T extends ContentStorage = ContentStorage>(contentType: string) => {
      return new ContentCrud(contentType, {
        contentRegistry: this.contentRegistry,
        eventBus: this.eventBus,
      }) as unknown as T;
    };

    return {
      register: this.contentRegistry.register.bind(this.contentRegistry),
      crud,
    };
  }
}
