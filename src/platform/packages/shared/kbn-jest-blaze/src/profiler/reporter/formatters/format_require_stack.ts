/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';
import { formatFilepath } from './format_filepath';

export function formatRequireStack(stack: string[], max: number) {
  const uniq = Array.from(new Set<string>(stack));

  if (uniq.length === 0) return [chalk.dim('(none)')];

  return uniq.map((file) => {
    const prefix = `  → `;
    return `${prefix}${formatFilepath(file, max - prefix.length)}`;
  });
}
