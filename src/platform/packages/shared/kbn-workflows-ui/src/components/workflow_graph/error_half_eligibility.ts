/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stepSupportsErrorHandling } from './step_supports_error_handling';

/**
 * Whether the split control's red "Add error path" half is available for the
 * node immediately upstream of a wire / terminal.
 *
 * Shared by canvas wire controls and the panel Settings tab — one predicate,
 * no copies. `on-failure` is a property of that upstream step, not of the edge.
 */
export function errorHalfEligible(args: {
  readonly isTrigger: boolean;
  readonly stepType: string | undefined;
  /** True when the upstream step already has at least one fallback step. */
  readonly hasFallback: boolean;
}): boolean {
  if (args.isTrigger) return false;
  if (args.hasFallback) return false;
  // Flow-control deferred inside stepSupportsErrorHandling (TODO(engine)).
  return stepSupportsErrorHandling(args.stepType);
}
