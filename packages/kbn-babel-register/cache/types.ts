/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Writable } from 'stream';

export interface CacheConfig {
  pathRoot: string;
  dir: string;
  prefix: string;
  log?: Writable;
}

export interface Cache {
  getMtime(path: string): string | undefined;
  getCode(path: string): string | undefined;
  getSourceMap(path: string): object | undefined;
  update(path: string, opts: { mtime: string; code: string; map?: any }): Promise<void>;
  close(): void;
}
