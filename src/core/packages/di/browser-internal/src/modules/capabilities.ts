/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { Capabilities, CoreStart } from '@kbn/core-di-browser';

export function loadCapabilities({ bind }: ContainerModuleLoadOptions): void {
  // TODO: is it ok to do this? nothing prevents someone from trying to use this in the setup phase
  bind(Capabilities)
    .toResolvedValue(({ capabilities }) => capabilities, [CoreStart('application')])
    .inSingletonScope();
}
