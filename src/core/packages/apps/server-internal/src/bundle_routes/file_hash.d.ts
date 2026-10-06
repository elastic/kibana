/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Stats } from 'fs';
import type { IFileHashCache } from './file_hash_cache';
/**
 *  Get the hash of a file via a file descriptor
 */
export declare function getFileHash(
  cache: IFileHashCache,
  path: string,
  stat: Stats,
  fd: number
): Promise<string>;
