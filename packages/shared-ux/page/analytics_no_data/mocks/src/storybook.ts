/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AbstractStorybookMocks } from '@kbn/shared-ux-storybook-mocks';
import { KibanaNoDataPageStorybookMocks } from '@kbn/shared-ux-page-kibana-no-data-mocks';
import type { KibanaNoDataPageStorybookParams } from '@kbn/shared-ux-page-kibana-no-data-mocks';
import type { AnalyticsNoDataPageServices } from '@kbn/shared-ux-page-analytics-no-data-types';

type ServiceArguments = Pick<AnalyticsNoDataPageServices, 'kibanaGuideDocLink'>;

export type Params = Record<keyof ServiceArguments, any> & KibanaNoDataPageStorybookParams;

export class StorybookMocks extends AbstractStorybookMocks<
  {},
  ServiceArguments,
  AnalyticsNoDataPageServices
> {
  propArguments = {};
  serviceArguments = {
    kibanaGuideDocLink: {
      control: 'text',
      defaultValue: 'Kibana guide',
    },
  };
  dependencies = [KibanaNoDataPageStorybookMocks];

  getServices(params: Params): AnalyticsNoDataPageServices {
    return {
      ...KibanaNoDataPageStorybookMocks.getServices(params),
      kibanaGuideDocLink: 'Kibana guide',
    };
  }
}
