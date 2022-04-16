/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Sha256 } from '../../utils';
export async function createLogKey(type: string, optionalIdentifier?: string) {
  const baseKey = `kibana.history.${type}`;

  if (!optionalIdentifier) {
    return baseKey;
  }

  const protectedIdentifier = new Sha256().update(optionalIdentifier, 'utf8').digest('base64');
  return `${baseKey}-${protectedIdentifier}`;
}
