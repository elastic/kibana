/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { unzlibSync, strFromU8 } from 'fflate';
import { BatchResponseItem, ErrorLike } from '../../common';

export function inflateResponse<Result extends object>(
  response: string
): BatchResponseItem<Result, ErrorLike> {
  try {
    const buff = Buffer.from(response, 'base64');

    const unzip = unzlibSync(buff);
    const inflatedRes = strFromU8(unzip);
    return JSON.parse(inflatedRes);
  } catch (e) {
    return JSON.parse(response);
  }
}
