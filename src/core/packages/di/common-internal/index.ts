/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { CoreInjectionService } from './src/service';
export {
  createSetupModule,
  createStartModule,
  InternalCoreSetup,
  InternalCoreStart,
  InternalPluginInitializer,
  type InternalPluginInitializerContext,
  type ServiceIdentifierFactory,
} from './src/modules/lifecycle';
export { Global } from './src/modules/plugin';
export type { InternalCoreDiServiceSetup, InternalCoreDiServiceStart } from './src/contracts';
export { cacheInScope } from './src/utils';
