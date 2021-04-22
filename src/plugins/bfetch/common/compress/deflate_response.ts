/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { zlibSync, strToU8 } from 'fflate';

const ENCODE_THRESHOLD = 1400;

export function deflateResponse<T>(resp: T, compressed?: boolean) {
  const strMessage = JSON.stringify(resp);
  compressed = compressed ?? strMessage.length > ENCODE_THRESHOLD;
  return JSON.stringify({
    compressed,
    payload: compressed
      ? Buffer.from(zlibSync(strToU8(strMessage), {})).toString('base64')
      : strMessage,
  });
}
