/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLAstPromqlCommand, ESQLMapEntry } from '../../../types';
import { isIdentifier, isSource } from '../../../ast/is';

export function getIndexFromPromQLParams({ params }: ESQLAstPromqlCommand): string | undefined {
  if (!params?.entries) {
    return undefined;
  }

  const indexEntry = params.entries.find(
    (entry): entry is ESQLMapEntry =>
      isIdentifier(entry.key) && entry.key.name.toLowerCase() === 'index'
  );

  const { value } = indexEntry ?? {};

  return isIdentifier(value) || isSource(value) ? value.name : undefined;
}
