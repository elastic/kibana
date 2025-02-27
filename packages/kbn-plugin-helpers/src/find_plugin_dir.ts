/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fs from 'fs';

export function findPluginDir(
  from = process.cwd()
): { dir: string; type: 'legacy' | 'package' } | undefined {
  if (Fs.existsSync(Path.resolve(from, 'kibana.json'))) {
    return {
      dir: from,
      type: 'legacy',
    };
  }

  if (Fs.existsSync(Path.resolve(from, 'kibana.jsonc'))) {
    return {
      dir: from,
      type: 'package',
    };
  }

  const parent = Path.dirname(from);
  if (parent === from) {
    return undefined;
  }

  return findPluginDir(parent);
}
