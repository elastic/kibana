/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AsCodeFilter } from '@kbn/as-code-filters-schema';
import { extractFilterReferences, injectFilterReferences } from './filter_references';

const conditionFilter: AsCodeFilter = {
  type: 'condition',
  data_view_id: 'logs-data-view',
  condition: { field: 'status', operator: 'is', value: 'active' },
};

const dslFilter: AsCodeFilter = {
  type: 'dsl',
  dsl: { match_all: {} },
};

const groupFilter: AsCodeFilter = {
  type: 'group',
  data_view_id: 'metrics-data-view',
  negate: true,
  group: {
    operator: 'or',
    conditions: [
      { field: 'host', operator: 'is', value: 'a' },
      { field: 'host', operator: 'exists' },
    ],
  },
};

describe('extractFilterReferences', () => {
  it('returns undefined filters and no references when filters are undefined', () => {
    expect(extractFilterReferences(undefined)).toEqual({ filters: undefined, references: [] });
  });

  it('replaces data_view_id with a reference name and extracts data view references', () => {
    const { filters, references } = extractFilterReferences([
      conditionFilter,
      dslFilter,
      groupFilter,
    ]);

    expect(filters).toEqual([
      {
        type: 'condition',
        data_view_ref_name: 'filters[0].data_view_id',
        condition: conditionFilter.condition,
      },
      dslFilter,
      {
        type: 'group',
        data_view_ref_name: 'filters[2].data_view_id',
        negate: true,
        group: (groupFilter as Extract<AsCodeFilter, { type: 'group' }>).group,
      },
    ]);
    expect(references).toEqual([
      { name: 'filters[0].data_view_id', type: 'index-pattern', id: 'logs-data-view' },
      { name: 'filters[2].data_view_id', type: 'index-pattern', id: 'metrics-data-view' },
    ]);
  });

  it('prefixes reference names with refNamePrefix', () => {
    const { filters, references } = extractFilterReferences([conditionFilter], {
      refNamePrefix: 'panel_1',
    });

    expect(filters?.[0].data_view_ref_name).toBe('panel_1.filters[0].data_view_id');
    expect(references).toEqual([
      { name: 'panel_1.filters[0].data_view_id', type: 'index-pattern', id: 'logs-data-view' },
    ]);
  });

  it('does not mutate the input filters', () => {
    const input = [conditionFilter];
    extractFilterReferences(input);
    expect(input[0]).toHaveProperty('data_view_id', 'logs-data-view');
  });
});

describe('injectFilterReferences', () => {
  it('returns undefined when filters are undefined', () => {
    expect(injectFilterReferences(undefined, [])).toBeUndefined();
  });

  it('round-trips filters extracted by extractFilterReferences', () => {
    const input = [conditionFilter, dslFilter, groupFilter];
    const { filters, references } = extractFilterReferences(input, { refNamePrefix: 'prefix' });

    expect(injectFilterReferences(filters, references)).toEqual(input);
  });

  it('uses the reference id, which may differ from the originally extracted id', () => {
    const { filters } = extractFilterReferences([conditionFilter]);

    expect(
      injectFilterReferences(filters, [
        { name: 'filters[0].data_view_id', type: 'index-pattern', id: 'imported-data-view' },
      ])
    ).toEqual([{ ...conditionFilter, data_view_id: 'imported-data-view' }]);
  });

  it('throws when a reference is missing', () => {
    const { filters } = extractFilterReferences([conditionFilter]);

    expect(() => injectFilterReferences(filters, [])).toThrow(
      'Could not find reference for filters[0].data_view_id'
    );
  });
});
