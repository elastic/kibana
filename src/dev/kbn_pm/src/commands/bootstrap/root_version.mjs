/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fsp from 'fs/promises';
import Path from 'path';

import { REPO_ROOT } from '../../lib/paths.mjs';

/** @returns {Promise<string>} */
export async function getRootVersion() {
  const json = JSON.parse(await Fsp.readFile(Path.resolve(REPO_ROOT, 'package.json'), 'utf8'));
  return json.version;
}
