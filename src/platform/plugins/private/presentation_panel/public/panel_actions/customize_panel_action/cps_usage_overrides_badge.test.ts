/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter, TimeRange } from '@kbn/es-query';
import { type AggregateQuery, type Query } from '@kbn/es-query';
import type { PublishesUnifiedSearch } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import { CpsUsageOverridesBadge } from './cps_usage_overrides_badge';

jest.mock('@kbn/esql-utils', () => ({
  getProjectRoutingFromEsqlQuery: jest.fn(),
}));

import { getProjectRoutingFromEsqlQuery } from '@kbn/esql-utils';

const mockGetProjectRoutingFromEsqlQuery = getProjectRoutingFromEsqlQuery as jest.MockedFunction<
  typeof getProjectRoutingFromEsqlQuery
>;

const mockEsqlQueryWithProjectRouting: AggregateQuery = {
  esql: 'SET project_routing = "_alias: *" | FROM kibana_sample_data_ecommerce',
};

const mockEsqlQueryWithoutProjectRouting: AggregateQuery = {
  esql: 'FROM kibana_sample_data_ecommerce',
};

const mockKqlQuery: Query = {
  query: 'test',
  language: 'kuery',
};

describe('CPS usage overrides badge action', () => {
  let action: CpsUsageOverridesBadge;
  let context: { embeddable: PublishesUnifiedSearch };

  let updateQuery: (query: Query | AggregateQuery | undefined) => void;

  beforeEach(() => {
    jest.clearAllMocks();

    const querySubject = new BehaviorSubject<Query | AggregateQuery | undefined>(undefined);
    updateQuery = (query) => querySubject.next(query);

    action = new CpsUsageOverridesBadge();
    context = {
      embeddable: {
        timeRange$: new BehaviorSubject<TimeRange | undefined>(undefined),
        filters$: new BehaviorSubject<Filter[] | undefined>(undefined),
        query$: querySubject,
      },
    };
  });

  it('is compatible when ESQL query has project routing override', async () => {
    mockGetProjectRoutingFromEsqlQuery.mockReturnValue('_alias: *');
    updateQuery(mockEsqlQueryWithProjectRouting);
    expect(await action.isCompatible(context)).toBe(true);
  });

  it('is incompatible when ESQL query has no project routing override', async () => {
    mockGetProjectRoutingFromEsqlQuery.mockReturnValue(undefined);
    updateQuery(mockEsqlQueryWithoutProjectRouting);
    expect(await action.isCompatible(context)).toBe(false);
  });

  it('is incompatible when query is KQL/Lucene', async () => {
    updateQuery(mockKqlQuery);
    expect(await action.isCompatible(context)).toBe(false);
  });

  describe('getOverrideValue', () => {
    it('returns project routing value from ESQL query', async () => {
      mockGetProjectRoutingFromEsqlQuery.mockReturnValue('_alias: *');
      updateQuery(mockEsqlQueryWithProjectRouting);
      expect(await action.isCompatible(context)).toBe(true);
      expect(mockGetProjectRoutingFromEsqlQuery).toHaveBeenCalledWith(
        'SET project_routing = "_alias: *" | FROM kibana_sample_data_ecommerce'
      );
    });

    it('returns undefined when ESQL query has no project routing', async () => {
      mockGetProjectRoutingFromEsqlQuery.mockReturnValue(undefined);
      updateQuery(mockEsqlQueryWithoutProjectRouting);
      expect(await action.isCompatible(context)).toBe(false);
    });

    it('returns undefined for non-ESQL queries', async () => {
      updateQuery(mockKqlQuery);
      expect(await action.isCompatible(context)).toBe(false);
      expect(mockGetProjectRoutingFromEsqlQuery).not.toHaveBeenCalled();
    });
  });
});
