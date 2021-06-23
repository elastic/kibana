/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as t from 'io-ts';
import { omitBy, isPlainObject, isEmpty } from 'lodash';
import { isLeft } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import Boom from '@hapi/boom';
import { strictKeysRt } from '@kbn/io-ts-utils';
import { RouteParamsRT } from './typings';

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
    throw Boom.badRequest(PathReporter.report(result)[0]);
  }

  return result.right;
}
