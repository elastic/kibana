/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of, Observable } from 'rxjs';
import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import { ControlsDataService } from '../data';

let valueSuggestionMethod = ({ field, query }: { field: DataViewField; query: string }) =>
  Promise.resolve(['storybook', 'default', 'values']);
export const replaceValueSuggestionMethod = (
  newMethod: ({ field, query }: { field: DataViewField; query: string }) => Promise<string[]>
) => (valueSuggestionMethod = newMethod);

export type DataServiceFactory = PluginServiceFactory<ControlsDataService>;
export const dataServiceFactory: DataServiceFactory = () => ({
  autocomplete: {
    getValueSuggestions: valueSuggestionMethod,
  } as unknown as DataPublicPluginStart['autocomplete'],
  query: {} as unknown as DataPublicPluginStart['query'],
  searchSource: {
    create: () => ({
      setField: () => {},
      fetch$: () =>
        of({
          resp: {
            rawResponse: { aggregations: { minAgg: { value: 0 }, maxAgg: { value: 1000 } } },
          },
        }),
    }),
  } as unknown as DataPublicPluginStart['search']['searchSource'],
  timefilter: {
    createFilter: () => {},
  } as unknown as DataPublicPluginStart['query']['timefilter']['timefilter'],
  fetchFieldRange: () => Promise.resolve({ min: 0, max: 100 }),
  fetchFieldRange$: () => new Observable<{ min: number; max: number }>(),
  getDataView: () => Promise.resolve({} as DataView),
  getDataView$: () => new Observable({} as any),
});
