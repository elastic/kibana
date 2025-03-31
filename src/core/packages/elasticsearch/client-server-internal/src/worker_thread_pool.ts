/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Piscina from 'piscina';
import path from 'path';

class ThreadPool {
  private static instance: Piscina;

  private constructor() {}

  public static getInstance(): Piscina {
    if (!ThreadPool.instance) {
      ThreadPool.instance = new Piscina({
        filename: path.join(__dirname, './worker.js'),
        // TODO: control the thread pool
      });
    }
    return ThreadPool.instance;
  }
}

export const pool = ThreadPool.getInstance();
