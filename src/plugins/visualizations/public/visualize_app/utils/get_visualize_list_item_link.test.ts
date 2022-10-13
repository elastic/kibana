/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getVisualizeListItemLink } from './get_visualize_list_item_link';
import { ApplicationStart } from '@kbn/core/public';
import { createHashHistory } from 'history';
import { FilterStateStore } from '@kbn/es-query';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { GLOBAL_STATE_STORAGE_KEY } from '../../../common/constants';

jest.mock('../../services', () => {
  return {
    getUISettings: () => ({
      get: jest.fn(),
    }),
  };
});

const application = {
  getUrlForApp: jest.fn((appId: string, options?: { path?: string; absolute?: boolean }) => {
    return `/app/${appId}${options?.path}`;
  }),
} as unknown as ApplicationStart;

const history = createHashHistory();
const kbnUrlStateStorage = createKbnUrlStateStorage({
  history,
  useHash: false,
});
kbnUrlStateStorage.set(GLOBAL_STATE_STORAGE_KEY, { time: { from: 'now-7d', to: 'now' } });

describe('listing item link is correct for each app', () => {
  test('creates a link to classic visualization if editApp is not defined', async () => {
    const editUrl = 'edit/id';
    const url = getVisualizeListItemLink(application, kbnUrlStateStorage, undefined, editUrl);
    expect(url).toMatchInlineSnapshot(`"/app/visualize#${editUrl}?_g=(time:(from:now-7d,to:now))"`);
  });

  test('creates a link for the app given if editApp is defined', async () => {
    const editUrl = '#/edit/id';
    const editApp = 'lens';
    const url = getVisualizeListItemLink(application, kbnUrlStateStorage, editApp, editUrl);
    expect(url).toMatchInlineSnapshot(`"/app/${editApp}${editUrl}?_g=(time:(from:now-7d,to:now))"`);
  });

  describe('when global time changes', () => {
    beforeEach(() => {
      kbnUrlStateStorage.set(GLOBAL_STATE_STORAGE_KEY, {
        time: {
          from: '2021-01-05T11:45:53.375Z',
          to: '2021-01-21T11:46:00.990Z',
        },
      });
    });

    test('it propagates the correct time on the query', async () => {
      const editUrl = '#/edit/id';
      const editApp = 'lens';
      const url = getVisualizeListItemLink(application, kbnUrlStateStorage, editApp, editUrl);
      expect(url).toMatchInlineSnapshot(
        `"/app/${editApp}${editUrl}?_g=(time:(from:'2021-01-05T11:45:53.375Z',to:'2021-01-21T11:46:00.990Z'))"`
      );
    });
  });

  describe('when global refreshInterval changes', () => {
    beforeEach(() => {
      kbnUrlStateStorage.set(GLOBAL_STATE_STORAGE_KEY, {
        refreshInterval: { pause: false, value: 300 },
      });
    });

    test('it propagates the refreshInterval on the query', async () => {
      const editUrl = '#/edit/id';
      const editApp = 'lens';
      const url = getVisualizeListItemLink(application, kbnUrlStateStorage, editApp, editUrl);
      expect(url).toMatchInlineSnapshot(
        `"/app/${editApp}${editUrl}?_g=(refreshInterval:(pause:!f,value:300))"`
      );
    });
  });

  describe('when global filters change', () => {
    beforeEach(() => {
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
            store: FilterStateStore.GLOBAL_STATE,
          },
        },
      ];
      kbnUrlStateStorage.set(GLOBAL_STATE_STORAGE_KEY, {
        filters,
      });
    });

    test('propagates the filters on the query', async () => {
      const editUrl = '#/edit/id';
      const editApp = 'lens';
      const url = getVisualizeListItemLink(application, kbnUrlStateStorage, editApp, editUrl);
      expect(url).toMatchInlineSnapshot(
        `"/app/${editApp}${editUrl}?_g=(filters:!((meta:(alias:!n,disabled:!f,negate:!f),query:(query:q1)),('$state':(store:globalState),meta:(alias:!n,disabled:!f,negate:!f),query:(query:q1))))"`
      );
    });
  });
});
