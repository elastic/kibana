/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ProvidedType } from '@kbn/test';
export { services as commonFunctionalServices } from './services/all';

import { KibanaServerProvider } from './services/kibana_server';
export type KibanaServer = ProvidedType<typeof KibanaServerProvider>;

export { RetryService } from './services/retry';

import { EsArchiverProvider } from './services/es_archiver';
export type EsArchiver = ProvidedType<typeof EsArchiverProvider>;

import { EsProvider } from './services/es';
export type Es = ProvidedType<typeof EsProvider>;

export type { FtrProviderContext } from './services/ftr_provider_context';
