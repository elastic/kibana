/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { sessionStorageMock } from './src/cookie_session_storage.mocks';
export { httpServerMock } from './src/http_server.mocks';
export { httpServiceMock } from './src/http_service.mock';
export type {
  HttpServicePrebootMock,
  HttpServiceSetupMock,
  HttpServiceStartMock,
  InternalHttpServicePrebootMock,
  InternalHttpServiceSetupMock,
  InternalHttpServiceStartMock,
} from './src/http_service.mock';
export { createCoreContext, createHttpService, createConfigService } from './src/test_utils';
