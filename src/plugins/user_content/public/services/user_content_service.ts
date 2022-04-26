/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { UserContentType } from '../types';

interface InitOptions<T> {
  /** Handler to fetch the saved object */
  get: (contentId: string) => Promise<T>;
}

interface Content<T> {
  /** Handler to fetch the saved object */
  get: (contentId: string) => Promise<T>;
}

export class UserContentService {
  private contents: Map<UserContentType, Content<unknown>>;

  constructor() {
    this.contents = new Map<UserContentType, Content<unknown>>();
  }

  init() {}

  register<T>(contentType: UserContentType, { get }: InitOptions<T>) {
    this.contents.set(contentType, {
      get,
    });
  }

  get<T = unknown>(contentType: UserContentType, contentId: string) {
    if (!this.contents.has(contentType)) {
      throw new Error(`Can't fetch content [${contentId}]. Unknown content type [${contentType}].`);
    }

    return this.contents.get(contentType)!.get(contentId) as unknown as T;
  }
}
