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

import { Doc } from 'ot-json1';
import { RealTimeJsonDriver, RealTimeOperation } from './types';

const clone = (x: unknown) => JSON.parse(JSON.stringify(x));

interface Document {
  id: string;
  version: number;
  snapshot: Doc;
  operations: RealTimeOperation[];
}

/**
 * In-memory implementation of @type {RealTimeJsonDriver}.
 */
export class RealTimeJsonDriverMemory implements RealTimeJsonDriver {
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
    snapshot: Doc,
    { create }: { create?: boolean } = {}
  ): Promise<void> {
    try {
      const { document, key } = this.getDocument(type, id);

      if (operation.version !== document.version + 1) {
        throw new Error('INVALID_VERSION');
      }

      document.operations.push(clone(operation));

      this.documents.set(key, {
        id,
        version: document.version + 1,
        snapshot: clone(snapshot),
        operations: document.operations,
      });
    } catch (error) {
      if (!create || operation.version !== 0 || error.message !== 'NOT_FOUND') throw error;

      const key = this.getKey(type, id);
      this.documents.set(key, {
        id,
        snapshot: clone(snapshot),
        version: 0,
        operations: [clone(operation)],
      });
    }
  }

  async getSnapshot(type: string, id: string): Promise<Doc> {
    const { document } = this.getDocument(type, id);
    return clone(document.snapshot);
  }

  async getOps(type: string, id: string, min: number): Promise<RealTimeOperation[]> {
    const { document } = this.getDocument(type, id);
    const operations = document.operations.filter((op) => op.version >= min);
    return clone(operations);
  }
}
