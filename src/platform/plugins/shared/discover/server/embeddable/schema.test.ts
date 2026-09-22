/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AS_CODE_DATA_VIEW_REFERENCE_TYPE,
  AS_CODE_ESQL_DATA_SOURCE_TYPE,
} from '@kbn/as-code-data-views-schema';
import { DiscoverTabType } from '@kbn/discover-session-constants';
import { mockGetDrilldownsSchema } from '@kbn/embeddable-plugin/server/mocks';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import {
  classicTabSchema,
  discoverSessionApiTabSchema,
  esqlTabSchema,
  panelOverridesSchema,
} from '@kbn/as-code-discover-schema';
import { getDiscoverSessionEmbeddableSchema } from './schema';

const classicTabInput = {
  data_source: {
    type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
    ref_id: 'logs-data-view',
  },
};

const esqlTabInput = {
  data_source: {
    type: AS_CODE_ESQL_DATA_SOURCE_TYPE,
    query: 'FROM logs-* | LIMIT 10',
  },
};

const metricsTabInput = {
  ...esqlTabInput,
  type: DiscoverTabType.Metrics,
  dimensions: ['host.name'],
  search_term: 'cpu',
  counter_aggregation: 'max',
  gauge_aggregation: 'avg',
  histogram_percentile: 'p99',
} as const;

// A sample tab for every tab type. The exhaustive record makes a new tab type a type error until
// it is covered here, and the parity tests below then require it in both schemas.
const tabInputByTabType: Record<DiscoverTabType, object> = {
  [DiscoverTabType.Default]: esqlTabInput,
  [DiscoverTabType.Metrics]: metricsTabInput,
};

const embeddableSchema = getDiscoverSessionEmbeddableSchema(mockGetDrilldownsSchema);

const parseByValueTab = (tab: unknown) => {
  const result = embeddableSchema.parse({ tabs: [tab] });

  if (!('tabs' in result)) {
    throw new Error('Expected a by-value Discover session panel.');
  }

  return result.tabs[0];
};

describe('classicTabSchema', () => {
  it('validates a data view reference tab and applies defaults', () => {
    const validated = classicTabSchema.parse(classicTabInput);

    expect(validated.data_source.type).toBe(AS_CODE_DATA_VIEW_REFERENCE_TYPE);
    expect(validated.filters).toEqual([]);
    expect(validated.sort).toEqual([]);
    expect(validated.view_mode).toBe(VIEW_MODE.DOCUMENT_LEVEL);
  });

  it('validates query and filters using as-code schemas', () => {
    const validated = classicTabSchema.parse({
      ...classicTabInput,
      query: {
        expression: 'status:200',
        language: 'kql',
      },
      filters: [
        {
          type: 'condition',
          condition: {
            field: 'host.name',
            operator: 'is',
            value: 'web-01',
          },
        },
      ],
    });

    expect(validated.query).toEqual({
      expression: 'status:200',
      language: 'kql',
    });
    expect(validated.filters).toHaveLength(1);
  });

  it('rejects an invalid data source type', () => {
    expect(() =>
      classicTabSchema.parse({
        ...classicTabInput,
        data_source: {
          type: 'invalid_type',
          ref_id: 'logs-data-view',
        },
      })
    ).toThrow();
  });

  it('rejects an invalid view mode', () => {
    expect(() =>
      classicTabSchema.parse({
        ...classicTabInput,
        view_mode: 'invalid_mode',
      })
    ).toThrow();
  });

  it('rejects an invalid sort direction', () => {
    expect(() =>
      classicTabSchema.parse({
        ...classicTabInput,
        sort: [{ name: '@timestamp', direction: 'sideways' }],
      })
    ).toThrow();
  });
});

describe('esqlTabSchema', () => {
  it('validates an ES|QL data source tab and applies data table defaults', () => {
    const validated = esqlTabSchema.parse(esqlTabInput);

    expect(validated.data_source.type).toBe(AS_CODE_ESQL_DATA_SOURCE_TYPE);
    expect(validated.data_source.query).toBe('FROM logs-* | LIMIT 10');
    expect(validated.sort).toEqual([]);
  });

  it('rejects a nested data_source shape', () => {
    expect(() =>
      esqlTabSchema.parse({
        data_source: {
          data_view: {
            ref_id: 'logs-data-view',
          },
        },
      })
    ).toThrow();
  });

  it('rejects a classic data view reference used as an ES|QL tab', () => {
    expect(() => esqlTabSchema.parse(classicTabInput)).toThrow();
  });

  it('accepts data table limits on ES|QL tabs', () => {
    const validated = esqlTabSchema.parse({
      ...esqlTabInput,
      rows_per_page: 25,
      sample_size: 500,
    });

    expect(validated.rows_per_page).toBe(25);
    expect(validated.sample_size).toBe(500);
  });
});

describe('by-value tab schema', () => {
  it.each([classicTabInput, esqlTabInput])(
    'accepts a $data_source.type tab with an omitted or explicit default type',
    (tabInput) => {
      const expectedTab = { ...tabInput, type: DiscoverTabType.Default };

      expect(parseByValueTab(tabInput)).toMatchObject(expectedTab);
      expect(parseByValueTab(expectedTab)).toMatchObject(expectedTab);
    }
  );

  it('accepts a Metrics ES|QL tab with its complete saved profile state', () => {
    expect(parseByValueTab(metricsTabInput)).toEqual({
      ...metricsTabInput,
      sort: [],
    });
  });

  it('rejects a Metrics tab without its saved profile state', () => {
    expect(() =>
      parseByValueTab({
        ...esqlTabInput,
        type: DiscoverTabType.Metrics,
      })
    ).toThrow();
  });

  it('rejects a Metrics tab with a classic data source', () => {
    expect(() =>
      parseByValueTab({
        ...classicTabInput,
        ...metricsTabInput,
        data_source: classicTabInput.data_source,
      })
    ).toThrow();
  });

  it('rejects a tab without a data_source', () => {
    expect(() => parseByValueTab({ sort: [] })).toThrow();
  });
});

describe('tab type parity', () => {
  it.each(Object.values(DiscoverTabType))('accepts a %s tab by value', (tabType) => {
    expect(parseByValueTab(tabInputByTabType[tabType])).toMatchObject({ type: tabType });
  });

  it.each(Object.values(DiscoverTabType))(
    'accepts the same %s tab in the session API schema',
    (tabType) => {
      const apiTab = discoverSessionApiTabSchema.parse({
        id: 'tab-1',
        label: 'Tab 1',
        ...tabInputByTabType[tabType],
      });

      expect(apiTab).toMatchObject({ type: tabType });
    }
  );
});

describe('panelOverridesSchema', () => {
  it('defaults to an empty object when omitted', () => {
    expect(panelOverridesSchema.parse(undefined)).toEqual({});
  });

  it('validates partial overrides', () => {
    expect(
      panelOverridesSchema.parse({
        column_order: ['@timestamp', 'message'],
        row_height: 'auto',
      })
    ).toEqual({
      column_order: ['@timestamp', 'message'],
      row_height: 'auto',
    });
  });
});
