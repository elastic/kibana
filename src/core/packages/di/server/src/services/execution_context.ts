/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createToken } from '@kbn/core-di';
import type { ServiceToken } from '@kbn/core-di';
import type { ExecutionContextSetup } from '@kbn/core-execution-context-server';

/**
 * The execution context tracking API.
 * @see {@link ExecutionContextSetup}
 * @public
 */
export type IExecutionContext = ExecutionContextSetup;

/**
 * The execution context tracking service.
 * @see {@link IExecutionContext}
 * @public
 */
export const ExecutionContext: ServiceToken<IExecutionContext> = createToken('ExecutionContext');
