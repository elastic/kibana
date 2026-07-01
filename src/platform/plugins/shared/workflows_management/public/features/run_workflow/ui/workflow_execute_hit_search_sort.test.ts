/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildWorkflowExecuteHitSearchEsSort,
  serializeWorkflowExecuteHitSortOrder,
} from './workflow_execute_hit_search_sort';

describe('workflow_execute_hit_search_sort', () => {
  it('serializeWorkflowExecuteHitSortOrder encodes field and direction', () => {
    expect(
      serializeWorkflowExecuteHitSortOrder([
        ['kibana.alert.rule.name', 'asc'],
        ['@timestamp', 'desc'],
      ])
    ).toBe('kibana.alert.rule.name:asc|@timestamp:desc');
  });

  it('buildWorkflowExecuteHitSearchEsSort maps synthetic document column to _doc', () => {
    expect(buildWorkflowExecuteHitSearchEsSort([['document', 'asc']])).toEqual([{ _doc: 'asc' }]);
  });

  it('buildWorkflowExecuteHitSearchEsSort uses Discover sort helper for data view fields', () => {
    const dataView = {
      timeFieldName: '@timestamp',
      type: 'default',
      isTimeNanosBased: () => false,
      getFieldByName: (name: string) =>
        name === '@timestamp'
          ? { sortable: true, name, type: 'date' }
          : name === 'message'
          ? { sortable: true, name, type: 'string' }
          : null,
    };

    const esSort = buildWorkflowExecuteHitSearchEsSort([['@timestamp', 'desc']], dataView as never);

    expect(esSort[0]).toMatchObject({
      '@timestamp': {
        order: 'desc',
      },
    });
    expect(esSort[esSort.length - 1]).toEqual({ _doc: 'desc' });
  });
});
