/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Container, ContainerModule } from 'inversify';
import { injectionServiceMock } from '@kbn/core-di-mocks';
import {
  CoreStart,
  ElasticsearchClient,
  InternalElasticsearchClient,
  Request,
  ScopedClusterClient,
  ScopedClusterClientFactory,
} from '@kbn/core-di-server';
import type { AsScopedOptions } from '@kbn/core-elasticsearch-server';
import {
  elasticsearchServiceMock,
  type MockedElasticSearchServiceStart,
} from '@kbn/core-elasticsearch-server-mocks';
import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loadElasticsearch } from './elasticsearch';

describe('loadElasticsearch', () => {
  let injection: jest.Mocked<ReturnType<typeof injectionServiceMock.createStartContract>>;
  let container: Container;
  let elasticsearch: MockedElasticSearchServiceStart;
  let scopedClusterClient: ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;
  let request: KibanaRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    injection = injectionServiceMock.createStartContract();
    scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    elasticsearch = elasticsearchServiceMock.createStart();
    elasticsearch.client.asScoped.mockReturnValue(scopedClusterClient);
    request = httpServerMock.createKibanaRequest();
    container = injection.getContainer();
    container.load(new ContainerModule(loadElasticsearch));
    container.bind(CoreStart('elasticsearch')).toConstantValue(elasticsearch);
    container.bind(Request).toConstantValue(request);
  });

  it('should resolve the scoped cluster client for the current request', () => {
    expect(container.get(ScopedClusterClient)).toBe(scopedClusterClient);
    expect(elasticsearch.client.asScoped).toHaveBeenCalledWith(request, undefined);
  });

  it('should create the scoped cluster client only once per scope', () => {
    const fork = injection.fork();

    expect(fork.get(ScopedClusterClient)).toBe(scopedClusterClient);
    expect(fork.get(ScopedClusterClient)).toBe(scopedClusterClient);
    expect(elasticsearch.client.asScoped).toHaveBeenCalledTimes(1);
  });

  it('should resolve the scoped cluster client factory without creating a client', () => {
    const factory = container.get(ScopedClusterClientFactory);

    expect(elasticsearch.client.asScoped).not.toHaveBeenCalled();
    expect(factory()).toBe(scopedClusterClient);
  });

  it('should pass the options and the current request to the scoped cluster client factory', () => {
    const options = { projectRouting: 'space' } as AsScopedOptions;

    expect(container.get(ScopedClusterClientFactory)(options)).toBe(scopedClusterClient);
    expect(elasticsearch.client.asScoped).toHaveBeenCalledWith(request, options);
  });

  it('should resolve the elasticsearch client for the current user', () => {
    expect(container.get(ElasticsearchClient)).toBe(scopedClusterClient.asCurrentUser);
    expect(elasticsearch.client.asScoped).toHaveBeenCalledWith(request, undefined);
  });

  it('should resolve the internal elasticsearch client', () => {
    expect(container.get(InternalElasticsearchClient)).toBe(elasticsearch.client.asInternalUser);
    expect(elasticsearch.client.asScoped).not.toHaveBeenCalled();
  });
});
