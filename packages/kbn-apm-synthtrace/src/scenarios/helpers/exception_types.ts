/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const exceptionTypes = [
  'ProgrammingError',
  'ProtocolError',
  'RangeError',
  'ReadTimeout',
  'ReadTimeoutError',
  'ReferenceError',
  'RemoteDisconnected',
  'RequestAbortedError',
  'ResponseError (action_request_validation_exception)',
  'ResponseError (illegal_argument_exception)',
  'ResponseError (index_not_found_exception)',
  'ResponseError (index_template_missing_exception)',
  'ResponseError (resource_already_exists_exception)',
  'ResponseError (resource_not_found_exception)',
  'ResponseError (search_phase_execution_exception)',
  'ResponseError (security_exception)',
  'ResponseError (transport_serialization_exception)',
  'ResponseError (version_conflict_engine_exception)',
  'ResponseError (x_content_parse_exception)',
  'ResponseError',
  'SIGTRAP',
  'SocketError',
  'SpawnError',
  'SyntaxError',
  'SyscallError',
  'TimeoutError',
  'TimeoutError',
  'TypeError',
];

export function getExceptionTypeForIndex(index: number) {
  return exceptionTypes[index % exceptionTypes.length];
}
