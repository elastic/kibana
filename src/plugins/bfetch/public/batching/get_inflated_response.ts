/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { inflateSync } from 'zlib';
import { BatchResponseItem, ErrorLike, BatchItemWrapper } from '../../common';

export function getInflatedResponse<Result extends object>(
  response: string
): BatchResponseItem<Result, ErrorLike> {
  const { compressed, payload } = JSON.parse(response) as BatchItemWrapper;

  try {
    const inputBuf = Buffer.from(payload, 'base64');
    const inflatedRes = compressed ? inflateSync(inputBuf).toString() : payload;
    return JSON.parse(inflatedRes);
  } catch (e) {
    return JSON.parse(payload);
  }
}
