/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const configureClientMock = jest.fn();
jest.doMock('./configure_client', () => ({
  configureClient: configureClientMock,
}));

export const createTransportMock = jest.fn();
jest.doMock('./create_transport', () => ({
  createTransport: createTransportMock,
}));

export const createInternalErrorHandlerMock = jest.fn();
jest.doMock('./retry_unauthorized', () => ({
  createInternalErrorHandler: createInternalErrorHandlerMock,
}));
