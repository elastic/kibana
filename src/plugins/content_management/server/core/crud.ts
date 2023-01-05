/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContentStorage } from './content_storage';
import { ContentRegistry } from './registry';

export class ContentCrud<T extends ContentStorage = ContentStorage> {
  private storage: T;

  constructor(contentType: string, contentRegistry: ContentRegistry) {
    this.storage = contentRegistry.getStorage(contentType);
  }

  get(...args: Parameters<T['get']>) {
    return this.storage.get(args[0], args[1]) as ReturnType<T['get']>;
  }

  mget(...args: Parameters<T['mget']>) {
    return this.storage.mget(args[0], args[1]) as ReturnType<T['mget']>;
  }

  create(...args: Parameters<T['create']>) {
    return this.storage.create(args[0], args[1]) as ReturnType<T['create']>;
  }

  update(...args: Parameters<T['update']>) {
    return this.storage.update(args[0], args[1], args[2]) as ReturnType<T['update']>;
  }

  delete(...args: Parameters<T['delete']>) {
    return this.storage.delete(args[0], args[1]) as ReturnType<T['delete']>;
  }

  search(...args: Parameters<T['search']>) {
    return this.storage.search(args[0]) as ReturnType<T['search']>;
  }
}
