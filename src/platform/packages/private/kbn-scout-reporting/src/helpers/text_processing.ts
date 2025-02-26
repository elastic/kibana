/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import stripANSI from 'strip-ansi';
import { REPO_ROOT } from '@kbn/repo-info';

export const stripFilePath = (filePath: string): string =>
  stripANSI(filePath.replaceAll(`${REPO_ROOT}/`, ''));

export function parseStdout(stdout: Array<string | Buffer>): string {
  const stdoutContent = stdout
    .map((chunk) => (Buffer.isBuffer(chunk) ? chunk.toString() : chunk))
    .join('');

  // Escape special HTML characters
  return stripANSI(stdoutContent);
}

export const excapeHtmlCharacters = (htmlText: string): string =>
  htmlText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
