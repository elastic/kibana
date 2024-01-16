/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const getServerTLSOptionsMock = jest.fn();

jest.doMock('./get_server_options', () => {
  const actual = jest.requireActual('./get_server_options');
  return {
    ...actual,
    getServerTLSOptions: getServerTLSOptionsMock,
  };
});
