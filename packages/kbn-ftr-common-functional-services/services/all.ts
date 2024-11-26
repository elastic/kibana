/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsArchiverProvider } from './es_archiver';
import { EsProvider } from './es';
import { KibanaServerProvider } from './kibana_server';
import { RetryService } from './retry';
import { SearchService } from './search';
import { ConsoleProvider } from './console';
import { DeploymentService } from './deployment';
import { EsDeleteAllIndicesProvider } from './es_delete_all_indices';
import { IndexPatternsService } from './index_patterns';
import { SavedObjectInfoService } from './saved_object_info';
import { RandomnessService } from './randomness';
import { SupertestWithoutAuthProvider } from './supertest_without_auth';
import { SamlAuthProvider } from './saml_auth';
import { KibanaSupertestProvider, ElasticsearchSupertestProvider } from './supertest';

export const services = {
  es: EsProvider,
  kibanaServer: KibanaServerProvider,
  esArchiver: EsArchiverProvider,
  retry: RetryService,
  search: SearchService,
  console: ConsoleProvider,
  deployment: DeploymentService,
  esDeleteAllIndices: EsDeleteAllIndicesProvider,
  indexPatterns: IndexPatternsService,
  savedObjectInfo: SavedObjectInfoService,
  randomness: RandomnessService,
  samlAuth: SamlAuthProvider,
  supertest: KibanaSupertestProvider,
  esSupertest: ElasticsearchSupertestProvider,
  supertestWithoutAuth: SupertestWithoutAuthProvider,
};
