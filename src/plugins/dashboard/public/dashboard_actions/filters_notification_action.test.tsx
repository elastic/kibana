/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter, FilterStateStore, type AggregateQuery, type Query } from '@kbn/es-query';

import { ViewMode } from '@kbn/presentation-publishing';
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
  let updateViewMode: (viewMode: ViewMode) => void;

  beforeEach(() => {
    const filtersSubject = new BehaviorSubject<Filter[] | undefined>(undefined);
    updateFilters = (filters) => filtersSubject.next(filters);
    const querySubject = new BehaviorSubject<Query | AggregateQuery | undefined>(undefined);
    updateQuery = (query) => querySubject.next(query);

    const viewModeSubject = new BehaviorSubject<ViewMode>('edit');
    updateViewMode = (viewMode) => viewModeSubject.next(viewMode);

    action = new FiltersNotificationAction();
    context = {
      embeddable: {
        uuid: 'testId',
        viewMode: viewModeSubject,
        parentApi: {
          getAllDataViews: jest.fn(),
          getDashboardPanelFromId: jest.fn(),
        },
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

  it('is incompatible when api is in view mode', async () => {
    updateFilters([getMockPhraseFilter('SuperField', 'SuperValue')]);
    updateQuery({ esql: 'FROM test_dataview' } as AggregateQuery);
    updateViewMode('view');
    expect(await action.isCompatible(context)).toBe(false);
  });

  it('calls onChange when view mode changes', () => {
    const onChange = jest.fn();
    updateFilters([getMockPhraseFilter('SuperField', 'SuperValue')]);
    updateQuery({ esql: 'FROM test_dataview' } as AggregateQuery);
    action.subscribeToCompatibilityChanges(context, onChange);
    updateViewMode('view');
    expect(onChange).toHaveBeenCalledWith(false, action);
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
