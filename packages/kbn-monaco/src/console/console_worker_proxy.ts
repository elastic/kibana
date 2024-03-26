/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CONSOLE_LANG_ID } from '../..';
import { monaco } from '../monaco_imports';
import { ConsoleParseResult, ConsoleWorkerDefinition } from './types';

export class ConsoleWorkerProxyService {
  private worker: monaco.editor.MonacoWebWorker<ConsoleWorkerDefinition> | undefined;

  public async getParseResult(modelUri: monaco.Uri): Promise<ConsoleParseResult | undefined> {
    if (!this.worker) {
      throw new Error('Worker Proxy Service has not been setup!');
    }
    await this.worker.withSyncedResources([modelUri]);
    const parser = await this.worker.getProxy();
    return parser.getParseResult(modelUri.toString());
  }

  public async getWorker(modelUri: monaco.Uri): Promise<ConsoleWorkerDefinition | undefined> {
    if (!this.worker) {
      throw new Error('Worker Proxy Service has not been setup!');
    }
    await this.worker.withSyncedResources([modelUri]);
    return this.worker.getProxy();
  }
  public setup() {
    this.worker = monaco.editor.createWebWorker({ label: CONSOLE_LANG_ID, moduleId: '' });
  }

  public stop() {
    if (this.worker) this.worker.dispose();
  }
}
