/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FileRpcError } from './types';

/**
 * Base class for all Files RPC service errors.
 */
export class FileRpcErrorGeneral extends Error implements FileRpcError {
  public readonly httpCode;
  public readonly code;

  constructor(message: string = 'Unknown error', code?: string, httpCode?: number) {
    super(message);
    this.code = code ?? 'UNKNOWN_ERROR';
    this.httpCode = httpCode ?? 400;
  }

  public toDto(): FileRpcError {
    return {
      message: this.message,
      code: this.code,
      httpCode: this.httpCode,
    };
  }
}

/**
 * Error thrown when some operation hooks fails with an error, which is not
 * {@link FileRpcErrorGeneral}. If a hook fails with a {@link FileRpcErrorGeneral}
 * error, it will be thrown as is.
 */
export class FileRpcErrorHookFailed extends FileRpcErrorGeneral {
  constructor(hookName: string) {
    super(`File service "${hookName}" hook failed.`, 'HOOK_FAILED');
  }
}
