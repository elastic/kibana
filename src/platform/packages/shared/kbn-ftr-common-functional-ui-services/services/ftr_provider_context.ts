/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GenericFtrProviderContext } from '@kbn/test';
import { GenericFtrService } from '@kbn/test';
import type {
  RetryService,
  EsProvider,
  KibanaServerProvider,
} from '@kbn/ftr-common-functional-services';
import type { services as commonFunctionalUiServices } from './all';

type AllServices = typeof commonFunctionalUiServices & {
  retry: typeof RetryService;
  es: typeof EsProvider;
  kibanaServer: typeof KibanaServerProvider;
};

export type FtrProviderContext = GenericFtrProviderContext<AllServices, {}>;
export class FtrService extends GenericFtrService<FtrProviderContext> {}
