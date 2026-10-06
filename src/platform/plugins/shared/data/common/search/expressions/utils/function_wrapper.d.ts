/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AnyExpressionFunctionDefinition,
  ExecutionContext,
} from '@kbn/expressions-plugin/common';
/**
 * Takes a function spec and passes in default args,
 * overriding with any provided args.
 */
export declare const functionWrapper: (
  spec: AnyExpressionFunctionDefinition
) => (context: object | null, args?: Record<string, any>, handlers?: ExecutionContext) => any;
