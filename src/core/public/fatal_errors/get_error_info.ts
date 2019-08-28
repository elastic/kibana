/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { inspect } from 'util';

/**
 * Produce a string version of an error,
 */
function formatErrorMessage(error: any): string {
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
 * Format the stack trace from a message so that it setups with the message, which
 * some browsers do automatically and some don't
 */
function formatStack(err: Error) {
  if (err.stack && !err.stack.includes(err.message)) {
    return 'Error: ' + err.message + '\n' + err.stack;
  }

  return err.stack;
}

/**
 * Produce a simple FatalErrorInfo object from some error and optional source, used for
 * displaying error information on the fatal error screen
 */
export function getErrorInfo(error: any, source?: string): FatalErrorInfo {
  const prefix = source ? source + ': ' : '';
  return {
    message: prefix + formatErrorMessage(error),
    stack: formatStack(error),
  };
}

/**
 * Represents the `message` and `stack` of a fatal Error
 *
 * @public
 * */
export interface FatalErrorInfo {
  message: string;
  stack: string | undefined;
}
