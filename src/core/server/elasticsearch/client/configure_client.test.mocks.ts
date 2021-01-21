/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const parseClientOptionsMock = jest.fn();
jest.doMock('./client_config', () => ({
  parseClientOptions: parseClientOptionsMock,
}));

export const ClientMock = jest.fn();
jest.doMock('@elastic/elasticsearch', () => {
  const actual = jest.requireActual('@elastic/elasticsearch');
  return {
    ...actual,
    Client: ClientMock,
  };
});
