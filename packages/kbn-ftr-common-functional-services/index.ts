/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ProvidedType } from '@kbn/test';
export { services as commonFunctionalServices } from './services/all';

import { KibanaServerProvider } from './services/kibana_server';
export { KibanaServerProvider } from './services/kibana_server';
export type KibanaServer = ProvidedType<typeof KibanaServerProvider>;

export { RetryService, type TryWithRetriesOptions } from './services/retry';

import { EsArchiverProvider } from './services/es_archiver';
export type EsArchiver = ProvidedType<typeof EsArchiverProvider>;

import { EsProvider } from './services/es';
export { EsProvider } from './services/es';
export type Es = ProvidedType<typeof EsProvider>;

import { SupertestWithoutAuthProvider } from './services/supertest_without_auth';
export type SupertestWithoutAuthProviderType = ProvidedType<typeof SupertestWithoutAuthProvider>;

export type {
  InternalRequestHeader,
  RoleCredentials,
  CookieCredentials,
  KibanaRoleDescriptors,
} from './services/saml_auth';

import { SamlAuthProvider } from './services/saml_auth/saml_auth_provider';
export type SamlAuthProviderType = ProvidedType<typeof SamlAuthProvider>;

export type { FtrProviderContext } from './services/ftr_provider_context';
export { runSavedObjInfoSvc } from './services/saved_object_info';

export type { SearchService, SendOptions } from './services/search';
export { SavedObjectInfoService } from './services/saved_object_info';
export { DeploymentService } from './services/deployment';
export { IndexPatternsService } from './services/index_patterns';
export { RandomnessService } from './services/randomness';
export { KibanaSupertestProvider, ElasticsearchSupertestProvider } from './services/supertest';
