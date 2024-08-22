/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SafeParseReturnType, SafeParseSuccess } from '@kbn/zod';
import { stringifyZodError } from './stringify_zod_error';

export function expectParseSuccess<Input, Output>(
  result: SafeParseReturnType<Input, Output>
): asserts result is SafeParseSuccess<Output> {
  if (!result.success) {
    // We are throwing here instead of using assertions because we want to show
    // the stringified error to assist with debugging.
    throw new Error(`Expected parse success, got error: ${stringifyZodError(result.error)}`);
  }
}
