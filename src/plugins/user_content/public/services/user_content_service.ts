/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { MetadataEventsService } from './metadata_events_service';

export interface InitOptions<T> {
  /** Handler to fetch the saved object */
  get: (contentId: string) => Promise<T>;
}

interface UserContent<T> {
  /** Handler to fetch the user content */
  get: (contentId: string) => Promise<T>;
}

interface Dependencies {
  metadataEventService: MetadataEventsService;
}
export class UserContentService {
  private contents: Map<string, UserContent<unknown>>;
  private metadataEventsService: MetadataEventsService | undefined;

  constructor() {
    this.contents = new Map<string, UserContent<unknown>>();
  }

  init({ metadataEventService }: Dependencies) {
    this.metadataEventsService = metadataEventService;
  }

  register<T>(contentType: string, { get }: InitOptions<T>): void {
    if (this.contents.has(contentType)) {
      throw new Error(`User content type [${contentType}] is already registered`);
    }

    this.contents.set(contentType, {
      get,
    });
  }

  get<T = unknown>(contentType: string, contentId: string): Promise<T> {
    const userContent = this.contents.get(contentType) as UserContent<T>;

    if (!userContent) {
      throw new Error(`Can't fetch content [${contentId}]. Unknown content type [${contentType}].`);
    }

    this.metadataEventsService?.registerEvent({
      type: 'viewed:kibana',
      data: { so_id: contentId },
    });

    return userContent.get(contentId);
  }
}
