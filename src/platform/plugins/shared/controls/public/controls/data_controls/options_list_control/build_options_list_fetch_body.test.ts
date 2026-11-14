/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlValuesSource } from '@kbn/controls-constants';
import type { FilterableField, FilterableSource } from '@kbn/data-source';
import type { FetchContext } from '@kbn/presentation-publishing';
import { buildOptionsListFetchBody } from './build_options_list_fetch_body';

describe('buildOptionsListFetchBody', () => {
  const fieldSpec = { name: 'host', type: 'string', searchable: true, aggregatable: true };
  const runtimeFieldMap = { day: { type: 'keyword' as const } };
  const dataViewSource: FilterableSource = {
    id: 'data-view-id',
    title: 'metrics-*',
    fields: [],
    getFieldByName: () => undefined,
    toSpec: () => ({ runtimeFieldMap }),
    isTimeBased: () => false,
  };
  const dataViewField: FilterableField = {
    name: 'host',
    type: 'string',
    toSpec: () => fieldSpec,
  };

  it('asks the title of the data view with the spec of the field and the runtime fields', () => {
    const result = buildOptionsListFetchBody({
      valuesSource: ControlValuesSource.FIELD,
      dataSources: [dataViewSource],
      field: dataViewField,
      fetchContext: { isReload: false, projectRouting: '_alias:*' } as FetchContext,
      useGlobalFilters: true,
      searchString: 'ma',
      sort: { by: '_key', direction: 'asc' },
      searchTechnique: 'prefix',
      requestSize: 10,
      runPastTimeout: false,
      selectedOptions: ['web-01'],
      ignoreValidations: false,
    });

    expect(result).toMatchObject({
      outcome: 'fetch',
      body: {
        kind: 'dsl',
        index: 'metrics-*',
        fieldName: 'host',
        fieldSpec,
        runtimeFieldMap,
        size: 10,
        selectedOptions: ['web-01'],
        projectRouting: '_alias:*',
      },
    });
  });
});
