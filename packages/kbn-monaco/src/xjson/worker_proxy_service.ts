/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ParseResult } from './grammar';
import { monaco } from '../monaco';
import { XJsonWorker } from './worker';
import { ID } from './constants';

export class WorkerProxyService {
  private worker: monaco.editor.MonacoWebWorker<XJsonWorker> | undefined;

  public async getAnnos(modelUri: monaco.Uri): Promise<ParseResult | undefined> {
    if (!this.worker) {
      throw new Error('Worker Proxy Service has not been setup!');
    }
    await this.worker.withSyncedResources([modelUri]);
    const proxy = await this.worker.getProxy();
    return proxy.parse(modelUri.toString());
  }

  public setup() {
    this.worker = monaco.editor.createWebWorker({ label: ID, moduleId: '' });
  }

  public stop() {
    if (this.worker) this.worker.dispose();
  }
}
