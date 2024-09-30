/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

export class FilesPluginError extends Error {
  constructor(message: string, public readonly meta?: any) {
    super(message);
    // For debugging - capture name of subclasses
    this.name = this.constructor.name;
  }
}

interface WrapErrorAndReThrowInterface {
  (e: Error, messagePrefix?: string): never;
  withMessagePrefix: (messagePrefix: string) => (e: Error) => never;
}

/**
 * A helper method that can be used with Promises to wrap errors encountered with more details
 * info. Mainly useful with calls to SO/ES as those errors normally don't include a good stack
 * trace that points to where the error occurred.
 * @param e
 * @param messagePrefix
 */
export const wrapErrorAndReThrow: WrapErrorAndReThrowInterface = (
  e: Error,
  messagePrefix: string = ''
): never => {
  if (e instanceof FilesPluginError) {
    throw e;
  }

  let details: string = '';

  // Create additional details based on known errors
  if (e instanceof errors.ResponseError) {
    details = `\nRequest: ${e.meta.meta.request.params.method} ${e.meta.meta.request.params.path}`;
  }

  throw new FilesPluginError(messagePrefix + e.message + details, e);
};
wrapErrorAndReThrow.withMessagePrefix = (messagePrefix: string): ((e: Error) => never) => {
  return (e: Error) => {
    return wrapErrorAndReThrow(e, messagePrefix);
  };
};
