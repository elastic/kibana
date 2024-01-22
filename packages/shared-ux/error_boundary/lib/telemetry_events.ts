/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
