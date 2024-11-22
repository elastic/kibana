/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { commonFunctionalServices, RetryService } from '@kbn/ftr-common-functional-services';
import { EsArchiverProvider } from '@kbn/ftr-common-functional-services/services/es_archiver';
import { KibanaServerProvider } from '@kbn/ftr-common-functional-services/services/kibana_server';
import { ProvidedType } from '@kbn/test';
import { EsProvider } from './es';
import { AuthService } from './auth';

export const services = {
  es: EsProvider,
  kibanaServer: commonFunctionalServices.kibanaServer,
  esArchiver: commonFunctionalServices.esArchiver,
  retry: commonFunctionalServices.retry,
  auth: AuthService,
};

export type EsArchiver = ProvidedType<typeof EsArchiverProvider>;
export type KibanaServer = ProvidedType<typeof KibanaServerProvider>;
export type Es = ProvidedType<typeof EsProvider>;
export type Auth = AuthService;
export type Retry = RetryService;
