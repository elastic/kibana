/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @internal */
export const REACT_FATAL_ERROR_EVENT_TYPE = 'fatal-error-react';

/** @internal */
export interface ReactFatalError {
  component_name: string;
  error_message: string;
}

/** @internal */
export const reactFatalErrorSchema = {
  component_name: {
    type: 'keyword' as const,
    _meta: {
      description: 'Name of react component that threw an error',
      optional: false as const,
    },
  },
  component_stack: {
    type: 'text' as const,
    _meta: {
      description: 'Stack trace React component tree',
      optional: false as const,
    },
  },
  component_render_min_duration_ms: {
    type: 'long' as const,
    _meta: {
      description:
        'Minimum duration in milliseconds that the fatal error component stayed rendered (before unmount). A max value of 10,000 (10s) is enforced to prevent excessive, indefinite or indeterminable durations.',
      optional: false as const,
    },
  },
  has_transient_navigation: {
    type: 'boolean' as const,
    _meta: {
      description:
        'Indicates if navigation occurred within the transient window (e.g. first 250ms) after the error occurred. This helps identify transient errors, successfully followed by a navigation, that users may not have seen.',
      optional: false as const,
    },
  },
  error_message: {
    type: 'keyword' as const,
    _meta: {
      description: 'Message from the error',
      optional: false as const,
    },
  },
  error_stack: {
    type: 'text' as const,
    _meta: {
      description: 'Stack trace from the error object',
      optional: false as const,
    },
  },
};
