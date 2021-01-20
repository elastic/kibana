/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { resolve } from 'path';
import { readFileSync } from 'fs';

export function generateNodeNoticeText(nodeDir, nodeVersion) {
  const licensePath = resolve(nodeDir, 'LICENSE');
  const license = readFileSync(licensePath, 'utf8');
  return `This product bundles Node.js v${nodeVersion}.\n\n${license}`;
}
