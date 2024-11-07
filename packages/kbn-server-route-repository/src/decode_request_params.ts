/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import { formatErrors, strictKeysRt } from '@kbn/io-ts-utils';
import { IoTsParamsObject } from '@kbn/server-route-repository-utils';
import { isLeft } from 'fp-ts/lib/Either';
import * as t from 'io-ts';

export function decodeRequestParams<T extends IoTsParamsObject>(
  params: Partial<{ path: any; query: any; body: any }>,
  paramsRt: T
): t.OutputOf<T> {
  // decode = validate
  const result = strictKeysRt(paramsRt).decode(params);

  if (isLeft(result)) {
    throw Boom.badRequest(formatErrors(result.left));
  }

  return result.right;
}
