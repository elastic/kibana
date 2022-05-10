/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter, Logger } from '@kbn/core/server';
import { SemVer } from 'semver';

import { EsLegacyConfigService, SpecDefinitionsService } from '../services';
import { ESConfigForProxy } from '../types';
import { ProxyConfigCollection } from '../lib';

import { registerEsConfigRoute } from './api/console/es_config';
import { registerProxyRoute } from './api/console/proxy';
import { registerSpecDefinitionsRoute } from './api/console/spec_definitions';

export interface ProxyDependencies {
  readLegacyESConfig: () => Promise<ESConfigForProxy>;
  pathFilters?: RegExp[]; // Only present in 7.x
  proxyConfigCollection?: ProxyConfigCollection; // Only present in 7.x
}

export interface RouteDependencies {
  router: IRouter;
  log: Logger;
  proxy: ProxyDependencies;
  services: {
    esLegacyConfigService: EsLegacyConfigService;
    specDefinitionService: SpecDefinitionsService;
  };
  kibanaVersion: SemVer;
}

export const registerRoutes = (dependencies: RouteDependencies) => {
  registerEsConfigRoute(dependencies);
  registerProxyRoute(dependencies);
  registerSpecDefinitionsRoute(dependencies);
};
