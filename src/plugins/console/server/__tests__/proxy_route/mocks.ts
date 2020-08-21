/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

jest.mock('../../lib/proxy_request', () => ({
  proxyRequest: jest.fn(),
}));

import { duration } from 'moment';
import { ProxyConfigCollection } from '../../lib';
import { RouteDependencies, ProxyDependencies } from '../../routes';
import { EsLegacyConfigService, SpecDefinitionsService } from '../../services';
import { coreMock, httpServiceMock } from '../../../../../core/server/mocks';

const defaultProxyValue = Object.freeze({
  readLegacyESConfig: async () => ({
    requestTimeout: duration(30000),
    customHeaders: {},
    requestHeadersWhitelist: [],
    hosts: ['http://localhost:9200'],
  }),
  pathFilters: [/.*/],
  proxyConfigCollection: new ProxyConfigCollection([]),
});

interface MockDepsArgument extends Partial<Omit<RouteDependencies, 'proxy'>> {
  proxy?: Partial<ProxyDependencies>;
}

export const getProxyRouteHandlerDeps = ({
  proxy,
  log = coreMock.createPluginInitializerContext().logger.get(),
  router = httpServiceMock.createSetupContract().createRouter(),
}: MockDepsArgument): RouteDependencies => {
  const services: RouteDependencies['services'] = {
    esLegacyConfigService: new EsLegacyConfigService(),
    specDefinitionService: new SpecDefinitionsService(),
  };

  return {
    services,
    router,
    proxy: proxy
      ? {
          ...defaultProxyValue,
          ...proxy,
        }
      : defaultProxyValue,
    log,
  };
};
