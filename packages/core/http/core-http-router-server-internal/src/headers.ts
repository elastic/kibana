/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Headers } from '@kbn/core-http-server';
import { pick } from '@kbn/std';

const normalizeHeaderField = (field: string) => field.trim().toLowerCase();

export function filterHeaders(
  headers: Headers,
  fieldsToKeep: string[],
  fieldsToExclude: string[] = []
): Headers {
  const fieldsToExcludeNormalized = fieldsToExclude.map(normalizeHeaderField);
  // Normalize list of headers we want to allow in upstream request
  const fieldsToKeepNormalized = fieldsToKeep
    .map(normalizeHeaderField)
    .filter((name) => !fieldsToExcludeNormalized.includes(name));

  return pick(headers, fieldsToKeepNormalized);
}
