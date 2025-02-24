/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

interface Result {
  name: string;
}

export function parseFileName(fileName: string): Result {
  const withoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
  return {
    name: withoutExt
      .trim()
      .slice(0, 256)
      .replace(/[^a-z0-9\s]/gi, '_'), // replace invalid chars
  };
}
