/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Context, Span, context } from '@opentelemetry/api';
import {
  WithActiveSpan,
  WithActiveSpanOptions,
  withActiveSpan,
  WithActiveSpanAsUnion,
  WithActiveSpanWithContext,
} from './with_active_span';

/**
 * Factory function that creates a version of {@link WithActiveSpan} with
 * default options.
 */
export function createWithActiveSpan(
  defaultOptions: WithActiveSpanOptions,
  withActiveSpanWrapper?: WithActiveSpanWithContext
): WithActiveSpan {
  return (...args: Parameters<WithActiveSpanAsUnion>) => {
    const name: string = args[0];

    const options: WithActiveSpanOptions = args.length === 2 ? {} : args[1];

    const ctx: Context = args.length === 4 ? args[2] : context.active();

    const cb: (span?: Span) => unknown =
      args.length === 2 ? args[1] : args.length === 3 ? args[2] : args[3];

    const nextOptions = {
      ...defaultOptions,
      ...options,
      attributes: {
        ...defaultOptions.attributes,
        ...options.attributes,
      },
    };

    const allArgs = [name, nextOptions, ctx, cb] as const;

    if (withActiveSpanWrapper) {
      return withActiveSpanWrapper(...allArgs);
    }

    return withActiveSpan(...allArgs);
  };
}
