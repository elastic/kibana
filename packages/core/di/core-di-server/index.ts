/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type {
  CoreDiServiceSetup,
  CoreDiServiceStart,
  CoreDiSetupModuleHelper,
  CoreDiSetupModuleCallback,
  CoreDiSetupModuleCallbackResult,
} from './src/contracts';
export type { InjectionRequestHandlerContext } from './src/request_handler_context';
export { requestServiceId } from './src/service_identifiers';
