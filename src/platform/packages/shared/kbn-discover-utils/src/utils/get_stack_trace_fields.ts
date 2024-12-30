/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFieldValue, LogDocument, StackTraceFields } from '..';
import {
  ERROR_EXCEPTION_STACKTRACE,
  ERROR_LOG_STACKTRACE,
  ERROR_STACK_TRACE,
} from '../field_constants';

export const getStacktraceFields = (doc: LogDocument): StackTraceFields => {
  const errorStackTrace = getFieldValue(doc, ERROR_STACK_TRACE);
  const errorExceptionStackTrace = getFieldValue(doc, ERROR_EXCEPTION_STACKTRACE);
  const errorLogStackTrace = getFieldValue(doc, ERROR_LOG_STACKTRACE);

  return {
    [ERROR_STACK_TRACE]: errorStackTrace,
    [ERROR_EXCEPTION_STACKTRACE]: errorExceptionStackTrace,
    [ERROR_LOG_STACKTRACE]: errorLogStackTrace,
  };
};
