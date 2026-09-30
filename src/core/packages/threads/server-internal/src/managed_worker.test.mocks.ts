/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EventEmitter } from 'node:events';

export class MockWorker extends EventEmitter {
  static instances: MockWorker[] = [];
  static failNextConstruction = 0;
  public readonly postMessage = jest.fn();
  public readonly unref = jest.fn();
  public readonly terminate = jest.fn(async () => {
    this.emit('exit', 1);
    return 1;
  });
  constructor(public readonly entry: string, public readonly workerOptions: object) {
    super();
    if (MockWorker.failNextConstruction > 0) {
      MockWorker.failNextConstruction--;
      throw new Error('cannot start worker');
    }
    MockWorker.instances.push(this);
  }
}

jest.doMock('node:worker_threads', () => ({ Worker: MockWorker }));
