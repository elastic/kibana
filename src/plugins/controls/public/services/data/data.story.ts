/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of } from 'rxjs';
import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { ControlsDataService } from './types';

export type DataServiceFactory = PluginServiceFactory<ControlsDataService>;
export const dataServiceFactory: DataServiceFactory = () => ({
  query: {} as unknown as DataPublicPluginStart['query'],
  searchSource: {
    create: () => ({
      setField: () => {},
      fetch$: () =>
        of({
          rawResponse: { aggregations: { minAgg: { value: 0 }, maxAgg: { value: 1000 } } },
        }),
    }),
  } as unknown as DataPublicPluginStart['search']['searchSource'],
  timefilter: {
    createFilter: () => {},
  } as unknown as DataPublicPluginStart['query']['timefilter']['timefilter'],
  fetchFieldRange: () => Promise.resolve({ min: 0, max: 100 }),
});
