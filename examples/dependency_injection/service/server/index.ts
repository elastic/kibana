/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContainerModule, type ServiceIdentifier } from 'inversify';
import { Global } from '@kbn/core-di';
import { Echo } from './echo';

export type { Echo };
export const EchoService = Symbol.for('EchoService') as ServiceIdentifier<Echo>;

export const module = new ContainerModule(({ bind }) => {
  bind(EchoService).to(Echo).inRequestScope();
  bind(Global).toConstantValue(EchoService);
});
