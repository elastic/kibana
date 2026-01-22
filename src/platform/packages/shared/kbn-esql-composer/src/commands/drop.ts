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
 * Appends a `DROP` command to the ESQL composer pipeline.
 *
 * @deprecated Migrate to `@kbn/esql-language` composer.
 * @param columns The columns to drop.
 * @returns A `QueryPipeline` instance with the `DROP` command appended.
 */
export function drop(...columns: Array<string | string[]>) {
  const command = `DROP ${columns.flatMap((column) => column).join(', ')}`;

  return append({
    command,
  });
}
