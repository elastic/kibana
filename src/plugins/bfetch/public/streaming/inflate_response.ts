/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { unzlibSync, strFromU8 } from 'fflate';

export function inflateResponse<Result extends object>(response: string) {
  const buff = Buffer.from(response, 'base64');
  const unzip = unzlibSync(buff);
  return strFromU8(unzip);
}
