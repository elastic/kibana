/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { ExpressionTypeDefinition, ExpressionValueBoxed } from '../types';
import type { ErrorLike } from '../../util';
export type ExpressionValueError = ExpressionValueBoxed<
  'error',
  {
    error: ErrorLike;
    info?: SerializableRecord;
  }
>;
export declare const isExpressionValueError: (value: unknown) => value is ExpressionValueError;
/**
 * @deprecated
 *
 * Exported for backwards compatibility.
 */
export type InterpreterErrorType = ExpressionValueError;
export declare const error: ExpressionTypeDefinition<'error', ExpressionValueError>;
