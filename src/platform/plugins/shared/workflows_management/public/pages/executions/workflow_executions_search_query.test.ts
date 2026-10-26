/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import {
  filtersToKql,
  getWorkflowExecutionsFetchErrorMessage,
  isUnsupportedFilter,
  isWorkflowExecutionsIndexNotFoundError,
} from './workflow_executions_search_query';

const phraseFilter = (
  key: string,
  query: string | undefined,
  { negate = false, value }: { negate?: boolean; value?: string } = {}
): Filter => ({
  meta: { type: 'phrase', key, negate, disabled: false, params: { query }, value },
});

describe('workflow_executions_search_query', () => {
  describe('isUnsupportedFilter', () => {
    it('flags active custom filters', () => {
      const filter = {
        meta: { type: 'custom', key: 'startedAt', negate: false, disabled: false },
        query: { bool: { filter: [] } },
      } as Filter;
      expect(isUnsupportedFilter(filter)).toBe(true);
    });

    it('does not flag disabled custom filters', () => {
      const filter = { meta: { type: 'custom', disabled: true } } as Filter;
      expect(isUnsupportedFilter(filter)).toBe(false);
    });

    it('does not flag translatable filters', () => {
      expect(isUnsupportedFilter(phraseFilter('workflowId', 'abc'))).toBe(false);
    });
  });

  describe('filtersToKql', () => {
    it('reads the phrase value from meta.params.query when meta.value is not set', () => {
      expect(filtersToKql([phraseFilter('workflowId', 'abc')])).toBe('(workflowId: abc)');
    });

    it('negates phrase filters', () => {
      expect(filtersToKql([phraseFilter('workflowId', 'abc', { negate: true })])).toBe(
        '(NOT workflowId: abc)'
      );
    });

    it('quotes phrase values that need escaping', () => {
      expect(filtersToKql([phraseFilter('workflowId', 'my workflow: 1')])).toBe(
        '(workflowId: "my workflow: 1")'
      );
    });

    it('drops phrase filters without a resolvable value instead of emitting invalid KQL', () => {
      expect(filtersToKql([phraseFilter('workflowId', undefined)])).toBe('');
    });

    it('quotes an empty phrase value', () => {
      expect(filtersToKql([phraseFilter('workflowId', '')])).toBe('(workflowId: "")');
    });

    it('converts phrases filters', () => {
      const filter: Filter = {
        meta: { type: 'phrases', key: 'triggeredBy', negate: false, params: ['manual', 'alert'] },
      };
      expect(filtersToKql([filter])).toBe('(triggeredBy: (manual or alert))');
    });

    it('converts exists filters', () => {
      const filter: Filter = { meta: { type: 'exists', key: 'executedBy', negate: true } };
      expect(filtersToKql([filter])).toBe('(NOT executedBy: *)');
    });

    it('converts range filters', () => {
      const filter: Filter = {
        meta: {
          type: 'range',
          key: 'startedAt',
          negate: false,
          params: { gte: '2020-01-01T00:00:00.000Z', lt: '2020-01-02T00:00:00.000Z' },
        },
      };
      expect(filtersToKql([filter])).toBe(
        '(startedAt >= "2020-01-01T00:00:00.000Z" and startedAt < "2020-01-02T00:00:00.000Z")'
      );
    });

    it('converts half-open and negated range filters', () => {
      const filter: Filter = {
        meta: { type: 'range', key: 'startedAt', negate: true, params: { gte: '2020-01-01' } },
      };
      expect(filtersToKql([filter])).toBe('(NOT (startedAt >= 2020-01-01))');
    });

    it('drops custom filters that cannot be translated', () => {
      const filter = {
        meta: { type: 'custom', key: 'startedAt', negate: false },
        query: { bool: { filter: [] } },
      } as Filter;
      expect(filtersToKql([filter])).toBe('');
    });

    it('falls back to query.match_phrase for filters without meta.type', () => {
      const filter = {
        meta: { key: 'workflowId', negate: false },
        query: { match_phrase: { workflowId: 'abc' } },
      } as Filter;
      expect(filtersToKql([filter])).toBe('(workflowId: abc)');
    });

    it('skips disabled filters and joins the rest with and', () => {
      const disabled: Filter = {
        meta: { type: 'phrase', key: 'a', disabled: true, params: { query: 'x' } },
      };
      expect(filtersToKql([disabled, phraseFilter('b', '1'), phraseFilter('c', '2')])).toBe(
        '(b: 1) and (c: 2)'
      );
    });
  });

  describe('isWorkflowExecutionsIndexNotFoundError', () => {
    it('returns true for an EsError-shaped index_not_found_exception', () => {
      const error = {
        attributes: { error: { type: 'index_not_found_exception', reason: 'missing' } },
      };

      expect(isWorkflowExecutionsIndexNotFoundError(error)).toBe(true);
    });

    it('returns true for a response error-shaped index_not_found_exception', () => {
      const error = {
        body: { error: { type: 'index_not_found_exception', reason: 'missing' } },
      };

      expect(isWorkflowExecutionsIndexNotFoundError(error)).toBe(true);
    });

    it('returns false for other errors', () => {
      expect(isWorkflowExecutionsIndexNotFoundError(new Error('other'))).toBe(false);
    });
  });

  describe('getWorkflowExecutionsFetchErrorMessage', () => {
    it('returns a generic message', () => {
      expect(getWorkflowExecutionsFetchErrorMessage()).toBe('Failed to load executions');
    });
  });
});
