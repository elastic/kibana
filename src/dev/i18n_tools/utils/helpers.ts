/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import normalize from 'normalize-path';
import { MessageDescriptor } from '../types';

export function normalizePath(inputPath: string) {
  return normalize(path.relative('.', inputPath));
}

export function makeAbsolutePath(inputPath: string, withTrailingSlash?: boolean) {
  const absPath = path.isAbsolute(inputPath) ? inputPath : path.resolve(inputPath);
  if (withTrailingSlash) {
    return path.join(absPath, path.sep);
  }

  return absPath;
}

export function arrayify(subj: unknown) {
  return Array.isArray(subj) ? subj : [subj];
}

export const descriptorDetailsStack = (
  messageDescriptor: MessageDescriptor,
  namespaceRoot: string
) => {
  return `
id: ${messageDescriptor.id}
message: ${messageDescriptor.defaultMessage}
file: ${messageDescriptor.file}
namespace: ${namespaceRoot}
`;
};
