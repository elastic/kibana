/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get } from 'lodash';
import type { RouteInputDeprecationDescription } from '@kbn/core-http-server';

export function findInputDeprecations(
  input: { query: unknown; body: unknown },
  deprecations: RouteInputDeprecationDescription[]
): string[] {
  const messages: string[] = [];
  for (const deprecation of deprecations) {
    if (deprecation.type === 'renamed') {
      if (!!get(input[deprecation.location], deprecation.old)) {
        messages.push(`"${deprecation.old}" has been removed. Use "${deprecation.new}" instead.`);
      }
    } else if (deprecation.type === 'removed') {
      if (!!get(input[deprecation.location], deprecation.path)) {
        messages.push(`"${deprecation.path}" has been removed.`);
      }
    }
  }
  return messages;
}
