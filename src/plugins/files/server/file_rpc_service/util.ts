/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FileRpcMethod, FileRpcError } from './types';

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
      if (!e || typeof e !== 'object') {
        const error: FileRpcError = {
          message: 'Unknown error',
          httpCode: 500,
        };
        throw error;  
      }

      const error: FileRpcError = {
        message: e.message ?? 'Unknown error',
        httpCode: 400,
      };

      if (e.code) {
        error.code = e.code;
      }

      throw error;
    }
  };

  return normalizedMethod;
};
