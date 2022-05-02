/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import fs from 'fs';
import { safeLoad } from 'js-yaml';

export function loadYaml(specPath: string) {
  try {
    const doc = safeLoad(fs.readFileSync(path.resolve(__dirname, '..', '..', specPath), 'utf8'));
    return doc as Record<string, any>;
  } catch (e) {
    console.error(`Failed to load spec from ${specPath}`);
    console.error(e);
    process.exit(1);
  }
}
