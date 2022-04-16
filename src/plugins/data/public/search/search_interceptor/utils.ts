/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import stringify from 'json-stable-stringify';
import { Sha256 } from '@kbn/core/public/utils';

export async function createRequestHash(keys: Record<string, any>) {
  return new Sha256().update(stringify(keys), 'utf8').digest('hex');
}
