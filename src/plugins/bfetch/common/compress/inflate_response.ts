/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { unzlibSync, strFromU8 } from 'fflate';
import { BatchResponseItem, ErrorLike, BatchItemWrapper } from '../../common';

export function inflateResponse<Result extends object>(
  response: string
): BatchResponseItem<Result, ErrorLike> {
  const { compressed, payload } = JSON.parse(response) as BatchItemWrapper;

  try {
    const inflatedRes = compressed
      ? strFromU8(unzlibSync(Buffer.from(payload, 'base64')))
      : payload;
    return JSON.parse(inflatedRes);
  } catch (e) {
    return JSON.parse(payload);
  }
}
