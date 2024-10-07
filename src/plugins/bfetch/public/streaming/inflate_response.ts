/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { unzlibSync, strFromU8 } from 'fflate';
import { toByteArray } from 'base64-js';

export function inflateResponse<Result extends object>(response: string) {
  const buff = toByteArray(response);
  const unzip = unzlibSync(buff);
  return strFromU8(unzip);
}
