/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '../monaco_imports';
import { CONSOLE_LANG_ID } from './constants';
import { ConsoleParserResult, ConsoleWorkerDefinition } from './types';

/*
 * This class contains logic to create a web worker where the code for the Console parser can
 * execute without blocking the main thread. The parser only runs when the Monaco editor
 * is used with the Console language. The parser can only be accessed via this proxy service class.
 */
export class ConsoleWorkerProxyService {
  private worker: monaco.editor.MonacoWebWorker<ConsoleWorkerDefinition> | undefined;

  public async getParserResult(modelUri: monaco.Uri): Promise<ConsoleParserResult | undefined> {
    if (!this.worker) {
      throw new Error('Worker Proxy Service has not been setup!');
    }
    await this.worker.withSyncedResources([modelUri]);
    const parser = await this.worker.getProxy();
    return parser.getParserResult(modelUri.toString());
  }

  public setup() {
    this.worker = monaco.editor.createWebWorker({ label: CONSOLE_LANG_ID, moduleId: '' });
  }

  public stop() {
    if (this.worker) this.worker.dispose();
  }
}
