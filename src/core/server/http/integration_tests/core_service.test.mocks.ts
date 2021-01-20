/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { elasticsearchServiceMock } from '../../elasticsearch/elasticsearch_service.mock';

export const MockLegacyScopedClusterClient = jest.fn();
export const legacyClusterClientInstanceMock = elasticsearchServiceMock.createLegacyScopedClusterClient();
jest.doMock('../../elasticsearch/legacy/scoped_cluster_client', () => ({
  LegacyScopedClusterClient: MockLegacyScopedClusterClient.mockImplementation(
    () => legacyClusterClientInstanceMock
  ),
}));

jest.doMock('elasticsearch', () => {
  const realES = jest.requireActual('elasticsearch');
  return {
    ...realES,
    // eslint-disable-next-line object-shorthand
    Client: function () {
      return elasticsearchServiceMock.createLegacyElasticsearchClient();
    },
  };
});

export const MockElasticsearchClient = jest.fn();
jest.doMock('@elastic/elasticsearch', () => {
  const real = jest.requireActual('@elastic/elasticsearch');
  return {
    ...real,
    Client: MockElasticsearchClient,
  };
});
