/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FileRpcErrorGeneral } from './errors';
import type { FileRpcMethod } from './types';

/**
 * Normalizes all errors thrown by the method to a {@link FileRpcError}.
 * 
 * @param method Method to normalize.
 */
export const normalizeErrors = <In, Out>(method: FileRpcMethod<In, Out>): FileRpcMethod<In, Out> => {
  const normalizedMethod: FileRpcMethod<In, Out> = async (req) => {
    try {
      return await method(req);
    } catch (e) {
      if (e instanceof FileRpcErrorGeneral) {
        throw e.toDto();
      }

      if (!e || typeof e !== 'object') {
        const error = new FileRpcErrorGeneral();
        throw error.toDto();
      }

      const error = new FileRpcErrorGeneral(
        e.message || undefined,
        e.code || undefined,
        e.httpCode || undefined
      );
      throw error.toDto();
    }
  };

  return normalizedMethod;
};
