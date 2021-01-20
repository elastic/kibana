/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const MockClient = jest.fn();
jest.mock('elasticsearch', () => {
  const original = jest.requireActual('elasticsearch');

  return {
    ...original,
    Client: MockClient,
  };
});

export const MockScopedClusterClient = jest.fn();
jest.mock('./scoped_cluster_client', () => ({
  LegacyScopedClusterClient: MockScopedClusterClient,
}));

export const mockParseElasticsearchClientConfig = jest.fn();
jest.mock('./elasticsearch_client_config', () => ({
  parseElasticsearchClientConfig: mockParseElasticsearchClientConfig,
}));
