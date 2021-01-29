/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { KibanaResponseFactory } from 'kibana/server';
import { KbnError } from '../common';

export class KbnServerError extends KbnError {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
  }
}

export function reportServerError(res: KibanaResponseFactory, err: any) {
  return res.customError({
    statusCode: err.statusCode ?? 500,
    body: {
      message: err.message,
      attributes: {
        error: err.body?.error || err.message,
      },
    },
  });
}
