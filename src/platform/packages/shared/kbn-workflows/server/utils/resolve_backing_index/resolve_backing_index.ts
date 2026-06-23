/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function extractBackingIndexSuffix({
  backingIndexName,
  backingIndexPrefix,
}: {
  backingIndexName: string;
  backingIndexPrefix: string;
}): string {
  if (!backingIndexName.startsWith(backingIndexPrefix)) {
    throw new Error(
      `Backing index name "${backingIndexName}" does not start with prefix "${backingIndexPrefix}"`
    );
  }
  return backingIndexName.slice(backingIndexPrefix.length);
}

export function resolveBackingIndex({
  backingIndexPrefix,
  indexSuffix,
}: {
  backingIndexPrefix: string;
  indexSuffix: string;
}): string {
  return `${backingIndexPrefix}${indexSuffix}`;
}
