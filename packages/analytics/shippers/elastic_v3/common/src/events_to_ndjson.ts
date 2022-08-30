/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Event } from '@kbn/analytics-client';

/**
 * Converts an array of events to a single ndjson string.
 * @param events An array of events {@link Event}
 */
export function eventsToNDJSON(events: Event[]): string {
  return `${events.map((event) => JSON.stringify(event)).join('\n')}\n`;
}
