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
import { discoverSessionApiTabSchema } from '@kbn/as-code-discover-schema';
import type { z } from '@kbn/zod';
import { expectType } from 'tsd';
import { getDiscoverSessionEmbeddableSchema } from './schema';
import type {
  DiscoverSessionEmbeddableByReferenceState,
  DiscoverSessionEmbeddableByValueState,
} from '../../common/embeddable/types';

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

describe('common embeddable state types', () => {
  type SchemaState = z.output<ReturnType<typeof getDiscoverSessionEmbeddableSchema>>;
  type SchemaByValueState = Exclude<SchemaState, { ref_id: string }>;
  type SchemaByReferenceState = Extract<SchemaState, { ref_id: string }>;
  type IsEquivalent<Left, Right> = [Left, keyof Left] extends [Right, keyof Right]
    ? [Right, keyof Right] extends [Left, keyof Left]
      ? true
      : false
    : false;

  it('are equivalent to the schema output', () => {
    expectType<IsEquivalent<DiscoverSessionEmbeddableByValueState, SchemaByValueState>>(true);
    expectType<IsEquivalent<DiscoverSessionEmbeddableByReferenceState, SchemaByReferenceState>>(
      true
    );
  });
});
