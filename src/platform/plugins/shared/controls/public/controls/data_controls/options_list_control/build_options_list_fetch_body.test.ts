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
  const field: FilterableField = { name: 'host', type: 'string', aggregatable: true };
  // The source of an ES|QL dataset: its fields and title, with no data view behind it.
  const esqlSource: FilterableSource = {
    kind: 'esql',
    id: 'esql-dataset-id',
    title: 'logs-*',
    fields: [field],
    isTimeBased: () => false,
  };

  it('requests the options of a field of an ES|QL source from its title', () => {
    const result = buildOptionsListFetchBody({
      valuesSource: ControlValuesSource.FIELD,
      dataViews: [esqlSource],
      field,
      fetchContext: { isReload: false, projectRouting: '_alias:*' } as FetchContext,
      useGlobalFilters: true,
      searchString: '',
      sort: { by: '_count', direction: 'desc' },
      searchTechnique: 'prefix',
      requestSize: 10,
      runPastTimeout: false,
      selectedOptions: [],
      ignoreValidations: false,
    });

    expect(result).toMatchObject({
      outcome: 'fetch',
      body: {
        kind: 'dsl',
        index: 'logs-*',
        fieldName: 'host',
        fieldSpec: field,
        runtimeFieldMap: undefined,
        projectRouting: '_alias:*',
      },
    });
  });
});
