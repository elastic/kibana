/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getVisualizeListItem } from './get_visualize_list_item_link';
import { ApplicationStart } from 'kibana/public';
import { Filter, esFilters, RefreshInterval } from '../../../../data/public';
import { getQueryService } from '../../services';

jest.mock('../../services', () => {
  let timeFilter = { from: 'now-7d', to: 'now' };
  let filters: Filter[] = [];
  let refreshInterval: RefreshInterval | null = null;
  return {
    getQueryService: () => ({
      timefilter: {
        timefilter: {
          getTime: jest.fn(() => timeFilter),
          setTime: jest.fn((newTimeFilter) => {
            timeFilter = newTimeFilter;
          }),
          getRefreshInterval: jest.fn(() => refreshInterval),
          setRefreshInterval: jest.fn((newInterval) => {
            refreshInterval = newInterval;
          }),
        },
      },
      filterManager: {
        getFilters: jest.fn(() => filters),
        setFilters: jest.fn((newFilters) => {
          filters = newFilters;
        }),
      },
    }),
    getUISettings: () => ({
      get: jest.fn(),
    }),
  };
});

const application = ({
  getUrlForApp: jest.fn((appId: string, options?: { path?: string; absolute?: boolean }) => {
    return `/app/${appId}${options?.path}`;
  }),
} as unknown) as ApplicationStart;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listing item link', () => {
  test('creates a link to classic visualization if editApp is not defined', async () => {
    const editUrl = 'edit/id';
    const url = getVisualizeListItem(application, undefined, editUrl);
    expect(url).toMatchInlineSnapshot(`"/app/visualize#${editUrl}?_g=(time:(from:now-7d,to:now))"`);
  });

  test('creates a link for the app given if editApp is defined', async () => {
    const editUrl = '#/edit/id';
    const editApp = 'lens';
    const url = getVisualizeListItem(application, editApp, editUrl);
    expect(url).toMatchInlineSnapshot(`"/app/${editApp}${editUrl}?_g=(time:(from:now-7d,to:now))"`);
  });

  test('propagates the correct time on the query', async () => {
    const editUrl = '#/edit/id';
    const editApp = 'lens';
    getQueryService().timefilter.timefilter.setTime({
      from: '2021-01-05T11:45:53.375Z',
      to: '2021-01-21T11:46:00.990Z',
    });
    const url = getVisualizeListItem(application, editApp, editUrl);
    expect(url).toMatchInlineSnapshot(
      `"/app/${editApp}${editUrl}?_g=(time:(from:'2021-01-05T11:45:53.375Z',to:'2021-01-21T11:46:00.990Z'))"`
    );
  });

  test('propagates the refreshInterval on the query', async () => {
    const editUrl = '#/edit/id';
    const editApp = 'lens';
    getQueryService().timefilter.timefilter.setRefreshInterval({ pause: false, value: 300 });
    const url = getVisualizeListItem(application, editApp, editUrl);
    expect(url).toMatchInlineSnapshot(
      `"/app/${editApp}${editUrl}?_g=(refreshInterval:(pause:!f,value:300),time:(from:'2021-01-05T11:45:53.375Z',to:'2021-01-21T11:46:00.990Z'))"`
    );
  });

  test('propagates the filters on the query', async () => {
    const editUrl = '#/edit/id';
    const editApp = 'lens';
    const filters = [
      {
        meta: {
          alias: null,
          disabled: false,
          negate: false,
        },
        query: { query: 'q1' },
      },
      {
        meta: {
          alias: null,
          disabled: false,
          negate: false,
        },
        query: { query: 'q1' },
        $state: {
          store: esFilters.FilterStateStore.GLOBAL_STATE,
        },
      },
    ];
    getQueryService().filterManager.setFilters(filters);
    const url = getVisualizeListItem(application, editApp, editUrl);
    expect(url).toMatchInlineSnapshot(
      `"/app/${editApp}${editUrl}?_g=(filters:!(('$state':(store:globalState),meta:(alias:!n,disabled:!f,negate:!f),query:(query:q1))),refreshInterval:(pause:!f,value:300),time:(from:'2021-01-05T11:45:53.375Z',to:'2021-01-21T11:46:00.990Z'))"`
    );
  });
});
