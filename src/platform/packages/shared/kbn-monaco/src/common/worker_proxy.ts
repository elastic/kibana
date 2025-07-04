/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '../monaco_imports';
import type { BaseWorkerDefinition } from '../types';

export class WorkerProxyService<IWorker extends BaseWorkerDefinition> {
  private worker: monaco.editor.MonacoWebWorker<IWorker> | undefined;

  public async getWorker(resources: monaco.Uri[]) {
    if (!this.worker) {
      throw new Error('Worker Proxy Service has not been setup!');
    }

    await this.worker.withSyncedResources(resources);
    return await this.worker.getProxy();
  }

  public setup(langId: string) {
    this.worker = monaco.editor.createWebWorker({ label: langId, moduleId: '' });
  }

  public stop() {
    if (this.worker) this.worker.dispose();
  }
}
