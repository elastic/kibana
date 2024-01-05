/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filesys } from './filesys';
import { SearchIndexAction } from './types';

export class TranslogService {
  private fileSys: Filesys;

  constructor() {
    this.fileSys = new Filesys();
  }

  public async store(action: SearchIndexAction) {
    const bucket = this.currentSecond();
    await this.fileSys?.store(action, bucket);
  }

  public async read(): Promise<SearchIndexAction[]> {
    if (!this.fileSys) {
      throw new Error('TranslogService not initialized');
    }
    return await this.fileSys.read();
  }

  public async clearUpTo(bucket: number) {
    await this.fileSys?.clearUpTo(bucket);
  }

  private currentSecond() {
    return Math.floor(new Date().getTime() / 1000);
  }
}
