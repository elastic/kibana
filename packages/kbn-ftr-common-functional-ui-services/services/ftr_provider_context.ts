/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { GenericFtrProviderContext, GenericFtrService } from '@kbn/test';
import { RetryService } from '@kbn/ftr-common-functional-services';
import { services as commonFunctionalUiServices } from './all';

const services = {
  ...commonFunctionalUiServices,
  retry: RetryService,
};

export type FtrProviderContext = GenericFtrProviderContext<typeof services, {}>;
export class FtrService extends GenericFtrService<FtrProviderContext> {}
