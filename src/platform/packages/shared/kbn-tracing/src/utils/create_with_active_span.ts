/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  WithActiveSpan,
  WithActiveSpanOptions,
  withActiveSpan,
  WithActiveSpanAsUnion,
} from './with_active_span';

/**
 * Factory function that creates a version of {@link WithActiveSpan} with
 * default options.
 */
export function createWithActiveSpan(defaultOptions: WithActiveSpanOptions): WithActiveSpan {
  return (...args: Parameters<WithActiveSpanAsUnion>) => {
    if (args.length === 2) {
      return withActiveSpan(args[0], defaultOptions, args[1]);
    }

    const [name, options, ...otherOptions] = args;

    const nextOptions = {
      ...defaultOptions,
      ...options,
      attributes: {
        ...defaultOptions.attributes,
        ...options.attributes,
      },
    };

    return otherOptions.length === 1
      ? withActiveSpan(name, nextOptions, otherOptions[0])
      : withActiveSpan(name, nextOptions, otherOptions[0], otherOptions[1]);
  };
}
