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

import { services as functionalServices } from '../../functional/services';
import { pageObjects } from '../../functional/page_objects';

import { KibanaEBTServerProvider, KibanaEBTUIProvider } from './kibana_ebt';

export const services = {
  ...commonFunctionalServices,
  ...commonFunctionalUIServices,
  ...functionalServices,
  kibana_ebt_server: KibanaEBTServerProvider,
  kibana_ebt_ui: KibanaEBTUIProvider,
};

export type FtrProviderContext = GenericFtrProviderContext<typeof services, typeof pageObjects>;
