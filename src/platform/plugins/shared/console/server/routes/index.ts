/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, Logger } from '@kbn/core/server';

import type { EsLegacyConfigService, SpecDefinitionsService } from '../services';
import type { ESConfigForProxy } from '../types';
import type { handleEsError } from '../shared_imports';

import { registerEsConfigRoute } from './api/console/es_config';
import { registerProxyRoute } from './api/console/proxy';
import { registerSpecDefinitionsRoute } from './api/console/spec_definitions';
import { registerAutocompleteEntitiesRoute } from './api/console/autocomplete_entities';
import { registerConvertRequestRoute } from './api/console/convert_request_to_language';

export interface ProxyDependencies {
  readLegacyESConfig: () => Promise<ESConfigForProxy>;
}

export interface RouteDependencies {
  router: IRouter;
  log: Logger;
  proxy: ProxyDependencies;
  services: {
    esLegacyConfigService: EsLegacyConfigService;
    specDefinitionService: SpecDefinitionsService;
  };
  lib: {
    handleEsError: typeof handleEsError;
  };
}

export const registerRoutes = (dependencies: RouteDependencies) => {
  registerEsConfigRoute(dependencies);
  registerProxyRoute(dependencies);
  registerSpecDefinitionsRoute(dependencies);
  registerAutocompleteEntitiesRoute(dependencies);
  registerConvertRequestRoute(dependencies);
};
