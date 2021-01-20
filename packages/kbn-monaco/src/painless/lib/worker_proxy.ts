/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { monaco } from '../../monaco_imports';
import { PainlessWorker } from '../worker';
import { ID } from '../constants';

export class WorkerProxyService {
  private worker: monaco.editor.MonacoWebWorker<PainlessWorker> | undefined;

  public async getWorker(resources: monaco.Uri[]) {
    if (!this.worker) {
      throw new Error('Worker Proxy Service has not been setup!');
    }

    await this.worker.withSyncedResources(resources);
    const proxy = await this.worker.getProxy();
    return proxy;
  }

  public setup() {
    this.worker = monaco.editor.createWebWorker({ label: ID, moduleId: '' });
  }

  public stop() {
    if (this.worker) this.worker.dispose();
  }
}
