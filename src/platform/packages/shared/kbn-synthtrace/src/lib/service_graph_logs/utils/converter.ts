/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogDocument } from '@kbn/synthtrace-client';
import { log } from '@kbn/synthtrace-client';

/**
 * Converts simulator tick output (partial log documents) into synthtrace log entries.
 * Shared by sigevents_onboarding and sigevents_incident scenarios.
 */
export function toLogEntries(
  partials: Array<Partial<LogDocument>>,
  timestamp: number
): Array<ReturnType<typeof log.create>> {
  return partials.map((partial) => {
    const entry = log
      .createMinimal()
      .message(partial.message ?? '')
      .logLevel(partial['log.level'] ?? 'info')
      .defaults(partial)
      .timestamp(timestamp);
    if (partial['service.name']) {
      entry.service(partial['service.name']);
    }
    return entry;
  });
}
