/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createHash } from 'crypto';

export function create(fullTitle: string, opts?: { ext?: boolean }) {
  const truncatedName = fullTitle.replaceAll(/[^ a-zA-Z0-9-]+/g, '').slice(0, 80);
  const failureNameHash = createHash('sha256').update(fullTitle).digest('hex');
  return `${truncatedName}-${failureNameHash}${opts?.ext === false ? '' : `.png`}`;
}
