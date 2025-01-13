/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Filter, FilterStateStore, type AggregateQuery, type Query } from '@kbn/es-query';

import { BehaviorSubject } from 'rxjs';
import {
  FiltersNotificationAction,
  FiltersNotificationActionApi,
} from './filters_notification_action';

const getMockPhraseFilter = (key: string, value: string): Filter => {
  return {
    meta: {
      type: 'phrase',
      key,
      params: {
        query: value,
      },
    },
    query: {
      match_phrase: {
        [key]: value,
      },
    },
    $state: {
      store: FilterStateStore.APP_STATE,
    },
  };
};

describe('filters notification action', () => {
  let action: FiltersNotificationAction;
  let context: { embeddable: FiltersNotificationActionApi };

  let updateFilters: (filters: Filter[]) => void;
  let updateQuery: (query: Query | AggregateQuery | undefined) => void;

  beforeEach(() => {
    const filtersSubject = new BehaviorSubject<Filter[] | undefined>(undefined);
    updateFilters = (filters) => filtersSubject.next(filters);
    const querySubject = new BehaviorSubject<Query | AggregateQuery | undefined>(undefined);
    updateQuery = (query) => querySubject.next(query);

    action = new FiltersNotificationAction();
    context = {
      embeddable: {
        uuid: 'testId',
        filters$: filtersSubject,
        query$: querySubject,
      },
    };
  });

  it('is incompatible when api is missing required functions', async () => {
    const emptyContext = { embeddable: {} };
    expect(await action.isCompatible(emptyContext)).toBe(false);
  });

  it('is incompatible when api has no local filters or queries', async () => {
    expect(await action.isCompatible(context)).toBe(false);
  });

  it('is compatible when api has at least one local filter', async () => {
    updateFilters([getMockPhraseFilter('SuperField', 'SuperValue')]);
    expect(await action.isCompatible(context)).toBe(true);
  });

  it('is compatible when api has at least one local query', async () => {
    updateQuery({ esql: 'FROM test_dataview' } as AggregateQuery);
    expect(await action.isCompatible(context)).toBe(true);
  });

  it('calls onChange when filters change', async () => {
    const onChange = jest.fn();
    action.subscribeToCompatibilityChanges(context, onChange);
    updateFilters([getMockPhraseFilter('SuperField', 'SuperValue')]);
    expect(onChange).toHaveBeenCalledWith(true, action);
  });

  it('calls onChange when query changes', async () => {
    const onChange = jest.fn();
    action.subscribeToCompatibilityChanges(context, onChange);
    updateQuery({ esql: 'FROM test_dataview' } as AggregateQuery);
    expect(onChange).toHaveBeenCalledWith(true, action);
  });
});
