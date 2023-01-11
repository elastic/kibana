/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ContentCrud } from './crud';
import { EventBus } from './event_bus';
import { ContentRegistry } from './registry';

export interface ContentCoreApi {
  register: ContentRegistry['register'];
  crud: <UniqueFields extends object = Record<string, unknown>>(
    contentType: string
  ) => ContentCrud<UniqueFields>;
}

export class ContentCore {
  private contentRegistry: ContentRegistry;
  private eventBus: EventBus;

  constructor() {
    this.contentRegistry = new ContentRegistry();
    this.eventBus = new EventBus();
  }

  setup(): ContentCoreApi {
    const crud = <UniqueFields extends object = Record<string, unknown>>(contentType: string) => {
      return new ContentCrud<UniqueFields>(contentType, {
        contentRegistry: this.contentRegistry,
        eventBus: this.eventBus,
      });
    };

    return {
      register: this.contentRegistry.register.bind(this.contentRegistry),
      crud,
    };
  }

  start() {}
}
