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

import { RealTimeJsonDriver, RealTimeOperation } from './types';

const clone = (x: unknown) => JSON.parse(JSON.stringify(x));

interface Document {
  id: string;
  version: number;
  snapshot: object;
}

/**
 * In-memory implementation of @type {RealTimeJsonDriver}.
 */
export class RealTimeJsonDriverMemory implements RealTimeJsonDriver {
  private readonly operations: RealTimeOperation[] = [];
  private readonly documents = new Map<string, Document>();

  private getKey(type: string, id: string) {
    return JSON.stringify([type, id]);
  }

  private getDocument(type: string, id: string): { document: Document; key: string } {
    const key = this.getKey(type, id);
    const document = this.documents.get(key);

    if (!document) {
      throw new Error('NOT_FOUND');
    }

    return {
      document,
      key,
    };
  }

  async commit(
    type: string,
    id: string,
    operation: RealTimeOperation,
    snapshot: unknown
  ): Promise<void> {
    const { document, key } = this.getDocument(type, id);

    if (operation.version !== document.version + 1) {
      throw new Error('INVALID_VERSION');
    }

    const newDocument: Document = {
      id,
      version: document.version + 1,
      snapshot: clone(snapshot),
    };

    this.operations.push(clone(operation));
    this.documents.set(key, newDocument);
  }

  async getSnapshot(type: string, id: string): Promise<object> {
    const { document } = this.getDocument(type, id);
    return document.snapshot;
  }

  async getOps(type: string, id: string, min: number): Promise<RealTimeOperation[]> {
    // Assert that document exists.
    this.getDocument(type, id);

    const operations = this.operations.filter((op) => op.version >= min);
    return operations;
  }
}
