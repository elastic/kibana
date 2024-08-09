/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import Boom from '@hapi/boom';
import { formatErrors, strictKeysRt } from '@kbn/io-ts-utils';
import { RouteParamsRT } from '@kbn/server-route-repository-utils';
import { isLeft } from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import { isEmpty, isPlainObject, omitBy } from 'lodash';

interface KibanaRequestParams {
  body: unknown;
  query: unknown;
  params: unknown;
}

export function decodeRequestParams<T extends RouteParamsRT>(
  params: KibanaRequestParams,
  paramsRt: T
): t.OutputOf<T> {
  const paramMap = omitBy(
    {
      path: params.params,
      body: params.body,
      query: params.query,
    },
    (val) => val === null || val === undefined || (isPlainObject(val) && isEmpty(val))
  );

  // decode = validate
  const result = strictKeysRt(paramsRt).decode(paramMap);

  if (isLeft(result)) {
    throw Boom.badRequest(formatErrors(result.left));
  }

  return result.right;
}
