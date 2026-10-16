/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { assertValidDuration } from '@kbn/workflows';

/**
 * Renders a duration that may be a Liquid template, then validates the result.
 * Throws when the rendered value is not a compound duration string.
 */
export function renderDuration(rawDuration: string, render: (value: string) => unknown): string {
  const rendered = render(rawDuration);
  const duration = typeof rendered === 'string' ? rendered.trim() : String(rendered ?? '');
  assertValidDuration(duration);
  return duration;
}
