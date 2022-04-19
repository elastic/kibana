/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { SemVer } from 'semver';

jest.mock('../../../../lib/proxy_request', () => ({
  proxyRequest: jest.fn(),
}));

import { duration } from 'moment';
import { coreMock, httpServiceMock } from '@kbn/core/server/mocks';
import { MAJOR_VERSION } from '../../../../../common/constants';
import { ProxyConfigCollection } from '../../../../lib';
import { RouteDependencies, ProxyDependencies } from '../../..';
import { EsLegacyConfigService, SpecDefinitionsService } from '../../../../services';

const kibanaVersion = new SemVer(MAJOR_VERSION);

const readLegacyESConfig = async () => ({
  requestTimeout: duration(30000),
  customHeaders: {},
  requestHeadersWhitelist: [],
  hosts: ['http://localhost:9200'],
});

let defaultProxyValue = Object.freeze({
  readLegacyESConfig,
});

if (kibanaVersion.major < 8) {
  // In 7.x we still support the "pathFilter" and "proxyConfig" kibana.yml settings
  defaultProxyValue = Object.freeze({
    readLegacyESConfig,
    pathFilters: [/.*/],
    proxyConfigCollection: new ProxyConfigCollection([]),
  });
}

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
    kibanaVersion,
  };
};
