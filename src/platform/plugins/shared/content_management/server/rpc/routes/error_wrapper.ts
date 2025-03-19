/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { boomify, isBoom } from '@hapi/boom';
import { ResponseError, CustomHttpResponseOptions } from '@kbn/core/server';

export function wrapError(error: any): CustomHttpResponseOptions<ResponseError> {
  const boom = isBoom(error)
    ? error
    : boomify(error, { statusCode: error.status ?? error.statusCode });
  const statusCode = boom.output.statusCode;
  return {
    body: {
      message: boom,
      ...(statusCode !== 500 && error.body ? { attributes: { body: error.body } } : {}),
    },
    headers: boom.output.headers as { [key: string]: string },
    statusCode,
  };
}
