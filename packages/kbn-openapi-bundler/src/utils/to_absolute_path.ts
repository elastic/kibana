/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join, isAbsolute } from 'path';

/**
 * Transforms a path to absolute path. If an absolute path passed to the function it's returned without
 * changes. Base path is current working directory by default.
 *
 * @param maybeAbsolutePath a path to be transformed into absolute path
 * @param baseDirPath a path from root to the folder maybeAbsolutePath is relative to
 * @returns absolute path
 */
export function toAbsolutePath(maybeAbsolutePath: string, baseDirPath: string): string {
  if (isAbsolute(maybeAbsolutePath)) {
    return maybeAbsolutePath;
  }

  return join(baseDirPath, maybeAbsolutePath);
}
