/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { Logger, LoggerFactory } from '@kbn/core-di';
import { cacheInScope } from '../utils';
import { InternalPluginInitializer } from './lifecycle';

export function loadLogging({ bind }: ContainerModuleLoadOptions): void {
  bind(Logger)
    .toResolvedValue((factory) => factory.get(), [LoggerFactory])
    .inRequestScope()
    .onActivation(cacheInScope(Logger));

  bind(LoggerFactory).toService(InternalPluginInitializer('logger'));
}
