/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { createProfileProviderSharedServicesMock } from '../../../__mocks__';
import { DataSourceCategory } from '../../../profiles';
import { EMPTY_CONTEXT_AWARENESS_TOOLKIT } from '../../../toolkit';
import type { AdditionalCellActionContext, UpdateESQLQueryFn } from '../../../types';
import { createPatternsDataSourceProfileProvider } from './profile';

const VIEW_MATCHING_RESULTS_ACTION_ID = 'patterns-action-view-docs-in-discover';
const PATTERN_FIELD: FieldSpec = {
  name: 'Pattern',
  type: 'string',
  searchable: false,
  aggregatable: false,
};
const ESQL_QUERY = {
  esql: 'FROM logs-* | WHERE service.name == "checkout" | STATS Count = COUNT(*) BY Pattern = CATEGORIZE(message) | SORT Count DESC',
};
const TIME_RANGE = { from: 'now-24h', to: 'now' };

const getViewMatchingResultsAction = (updateESQLQuery?: UpdateESQLQueryFn) => {
  const services = createProfileProviderSharedServicesMock();
  const provider = createPatternsDataSourceProfileProvider(services);

  // Non-null assertion: accessors are optional on the profile type, this one is implemented here.
  const actions = provider.profile.getAdditionalCellActions!(() => [], {
    context: {
      category: DataSourceCategory.Default,
      patternColumns: ['Pattern'],
      sparklineColumns: [],
    },
    toolkit: { ...EMPTY_CONTEXT_AWARENESS_TOOLKIT, actions: { updateESQLQuery } },
  })();
  const action = actions.find(({ id }) => id === VIEW_MATCHING_RESULTS_ACTION_ID);

  if (!action) {
    throw new Error(`${VIEW_MATCHING_RESULTS_ACTION_ID} is not registered`);
  }

  return { action, services };
};

const createContext = (
  overrides: Partial<AdditionalCellActionContext> = {}
): AdditionalCellActionContext => ({
  field: PATTERN_FIELD,
  value: '.*?payment.+?failed.*?',
  dataView: dataViewMock,
  query: ESQL_QUERY,
  timeRange: TIME_RANGE,
  esqlVariables: [],
  ...overrides,
});

describe('patternsDataSourceProfileProvider', () => {
  describe('View matching results cell action', () => {
    let windowOpen: jest.SpyInstance;

    beforeEach(() => {
      windowOpen = jest.spyOn(window, 'open').mockImplementation(() => null);
    });

    afterEach(() => {
      windowOpen.mockRestore();
    });

    it('is only compatible with pattern columns of an ES|QL query', async () => {
      const { action } = getViewMatchingResultsAction();

      expect(await action.isCompatible?.(createContext())).toBe(true);
      expect(
        await action.isCompatible?.(createContext({ field: { ...PATTERN_FIELD, name: 'Count' } }))
      ).toBe(false);
      expect(
        await action.isCompatible?.(createContext({ query: { query: '', language: 'kuery' } }))
      ).toBe(false);
    });

    it('replaces the query in the current tab, keeping the commands preceding the STATS', async () => {
      const updateESQLQuery = jest.fn();
      const { action } = getViewMatchingResultsAction(updateESQLQuery);

      await action.execute(createContext());

      expect(updateESQLQuery).toHaveBeenCalledTimes(1);
      const [newQuery] = updateESQLQuery.mock.calls[0];
      expect(newQuery).toMatch(/^FROM logs-\*\n {2}\| WHERE service\.name == "checkout"\n/);
      expect(newQuery).toMatch(/MATCH\(\s*message, "payment failed"/);
      expect(newQuery).not.toContain('STATS');
      expect(windowOpen).not.toHaveBeenCalled();
    });

    it('opens the query in a new window when the host cannot update the query', async () => {
      const { action, services } = getViewMatchingResultsAction();
      jest.mocked(services.locator.getRedirectUrl).mockReturnValue('/app/discover#/matching');

      await action.execute(createContext());

      expect(services.locator.getRedirectUrl).toHaveBeenCalledWith({
        query: { esql: expect.stringMatching(/MATCH\(\s*message, "payment failed"/) },
        timeRange: TIME_RANGE,
        hideChart: false,
      });
      expect(windowOpen).toHaveBeenCalledWith('/app/discover#/matching', '_blank');
    });

    it('does nothing when the cell has no pattern', async () => {
      const updateESQLQuery = jest.fn();
      const { action } = getViewMatchingResultsAction(updateESQLQuery);

      await action.execute(createContext({ value: null }));

      expect(updateESQLQuery).not.toHaveBeenCalled();
      expect(windowOpen).not.toHaveBeenCalled();
    });
  });
});
