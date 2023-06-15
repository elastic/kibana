/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { errors } from '@elastic/elasticsearch';
import type { FileMetadata } from '../../common';

export function createDefaultFileAttributes(): Pick<
  FileMetadata,
  'created' | 'Updated' | 'Status'
> {
  const dateString = new Date().toISOString();
  return {
    created: dateString,
    Status: 'AWAITING_UPLOAD',
    Updated: dateString,
  };
}

class FilesPluginError extends Error {
  constructor(message: string, public readonly meta: any) {
    super(message);
  }
}

export const catchErrorWrapAndThrow = (e: Error, messagePrefix: string = ''): never => {
  if (e instanceof FilesPluginError) {
    throw e;
  }

  let details: string = '';

  if (e instanceof errors.ResponseError) {
    details = `\nRequest: ${e.meta.meta.request.params.method} ${e.meta.meta.request.params.path}`;
  }

  throw new FilesPluginError(messagePrefix + e.message + details, e);
};
