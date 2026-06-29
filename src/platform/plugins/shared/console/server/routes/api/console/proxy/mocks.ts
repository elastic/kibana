/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { duration } from 'moment';
import { coreMock, elasticsearchServiceMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { RouteDependencies, ProxyDependencies } from '../../..';
import { EsLegacyConfigService, SpecDefinitionsService } from '../../../../services';
import { handleEsError } from '../../../../shared_imports';
import { createTransportResponseStub } from './stubs';

const readLegacyESConfig = async () => ({
  requestTimeout: duration(30000),
  customHeaders: {},
  requestHeadersWhitelist: [],
  hosts: ['http://localhost:9200'],
});

const defaultProxyValue = Object.freeze({
  readLegacyESConfig,
});

interface MockDepsArgument extends Partial<Omit<RouteDependencies, 'proxy'>> {
  proxy?: Partial<ProxyDependencies>;
}

export const getProxyRouteHandlerDeps = ({
  proxy,
  log = coreMock.createPluginInitializerContext().logger.get(),
  router = httpServiceMock.createSetupContract().createRouter(),
  getStartServices = coreMock.createSetup().getStartServices,
}: MockDepsArgument): RouteDependencies => {
  const services: RouteDependencies['services'] = {
    esLegacyConfigService: new EsLegacyConfigService(),
    specDefinitionService: new SpecDefinitionsService(),
  };

  return {
    services,
    router,
    getStartServices,
    proxy: proxy
      ? {
          ...defaultProxyValue,
          ...proxy,
        }
      : defaultProxyValue,
    log,
    lib: { handleEsError },
  };
};

export const getRequestHandlerContext = (response?: string) => {
  const scopedClient = elasticsearchServiceMock.createScopedClusterClient();
  scopedClient.asCurrentUser.transport.request.mockResolvedValue(
    createTransportResponseStub(response)
  );

  return {
    core: Promise.resolve({
      elasticsearch: {
        client: scopedClient,
      },
    }),
    transportRequest: scopedClient.asCurrentUser.transport.request,
  };
};
