/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GenericFtrProviderContext } from '@kbn/test';
import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';
import { commonFunctionalUIServices } from '@kbn/ftr-common-functional-ui-services';

export const kibanaCommonServices = {
  ...commonFunctionalServices,
  ...commonFunctionalUIServices,
} as const;

import { services as kibanaApiIntegrationServices } from '../../api_integration/services';

export type FtrProviderContext = GenericFtrProviderContext<
  typeof kibanaCommonServices & { supertest: typeof kibanaApiIntegrationServices.supertest },
  {}
>;
