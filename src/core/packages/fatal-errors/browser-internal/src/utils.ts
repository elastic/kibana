/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inspect } from 'util';

function getErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error;
  }

  if (!error) {
    // stringify undefined/null/0/whatever this falsy value is
    return inspect(error);
  }

  // handle es error response with `root_cause`s
  if (error.resp && error.resp.error && error.resp.error.root_cause) {
    return error.resp.error.root_cause.map((cause: { reason: string }) => cause.reason).join('\n');
  }

  // handle http response errors with error messages
  if (error.body && typeof error.body.message === 'string') {
    return error.body.message;
  }

  // handle standard error objects with messages
  if (error instanceof Error && error.message) {
    return error.message;
  }

  // everything else can just be serialized using util.inspect()
  return inspect(error);
}

/**
 * Produce a string version of an error,
 */
export function formatError(error: string | Error, source?: string): string {
  return `${source ? source + ': ' : ''}${getErrorMessage(error)}`;
}

/**
 * Format the stack trace from a message so that it setups with the message, which
 * some browsers do automatically and some don't
 */
export function formatStack(error: string | Error): string {
  if (typeof error === 'string') {
    return '';
  }

  if (error.stack && !error.stack.includes(error.message)) {
    return 'Error: ' + error.message + '\n' + error.stack;
  }

  return error.stack ?? '';
}
