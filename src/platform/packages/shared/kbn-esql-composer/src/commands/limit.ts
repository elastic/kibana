/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { append } from '../pipeline/append';

/**
 * Appends a `LIMIT` command to the ESQL composer pipeline.
 *
 * @deprecated Migrate to `@kbn/esql-language` composer.
 * @param value The limit to apply.
 * @returns A `QueryPipeline` instance with the `LIMIT` command appended.
 */
export function limit(value: number) {
  return append({ command: `LIMIT ${value}` });
}
