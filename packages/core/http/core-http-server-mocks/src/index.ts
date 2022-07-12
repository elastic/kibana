/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { sessionStorageMock } from './cookie_session_storage.mocks';
export { httpServerMock } from './http_server.mocks';
export { httpServiceMock } from './http_service.mock';
export type {
  HttpServicePrebootMock,
  HttpServiceSetupMock,
  HttpServiceStartMock,
  InternalHttpServicePrebootMock,
  InternalHttpServiceSetupMock,
  InternalHttpServiceStartMock,
} from './http_service.mock';

export { mockRouter, RouterMock } from '@kbn/core-http-router-server-mocks';

export { createCoreContext, createHttpServer } from './test_utils';
