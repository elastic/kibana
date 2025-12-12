/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceIdentifier } from 'inversify';
import type { Logger as ILogger, LoggerFactory as ILoggerFactory } from '@kbn/logging';

/**
 * Plugin's default logger instance.
 * @public
 */
export const Logger = Symbol.for('Logger') as ServiceIdentifier<ILogger>;

/**
 * Plugin's logger factory.
 * @public
 */
export const LoggerFactory = Symbol.for('LoggerFactory') as ServiceIdentifier<ILoggerFactory>;
