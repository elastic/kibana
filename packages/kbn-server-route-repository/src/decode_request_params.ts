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
import Boom from '@hapi/boom';
import { strictKeysRt } from '@kbn/io-ts-utils';
import { isObject } from 'lodash/fp';
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
    throw Boom.badRequest(formatErrors(result.left).join('|'));
  }

  return result.right;
}

export const formatErrors = (errors: t.Errors): string[] => {
  const err = errors.map((error) => {
    if (error.message != null) {
      return error.message;
    } else {
      const keyContext = error.context
        .filter(
          (entry) => entry.key != null && !Number.isInteger(+entry.key) && entry.key.trim() !== ''
        )
        .map((entry) => entry.key)
        .join(',');

      const nameContext = error.context.find(
        (entry) => entry.type != null && entry.type.name != null && entry.type.name.length > 0
      );
      const suppliedValue =
        keyContext !== '' ? keyContext : nameContext != null ? nameContext.type.name : '';
      const value = isObject(error.value) ? JSON.stringify(error.value) : error.value;
      return `Invalid value "${value}" supplied to "${suppliedValue}"`;
    }
  });

  return [...new Set(err)];
};
