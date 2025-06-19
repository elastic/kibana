/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import DiskStore from 'cache-manager-fs-hash';
import { KeyvAdapter } from 'cache-manager';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { Keyv } from 'keyv';

export interface LocalDiskCacheOptions {
  dir: string;
  ttl?: number;
}

export function createLocalDirDiskCacheStore(opts: LocalDiskCacheOptions): Keyv {
  const adapter = new KeyvAdapter(
    DiskStore.create({
      store: DiskStore,
      options: { path: Path.join(REPO_ROOT, 'data', opts.dir), ttl: opts.ttl },
    })
  );

  return new Keyv({ store: adapter });
}
