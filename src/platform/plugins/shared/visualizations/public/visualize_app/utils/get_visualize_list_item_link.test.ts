/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getVisualizeListItemLinkFn } from './get_visualize_list_item_link';
import type { ApplicationStart } from '@kbn/core/public';
import { createHashHistory } from 'history';
import { FilterStateStore } from '@kbn/es-query';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { GLOBAL_STATE_STORAGE_KEY } from '@kbn/visualizations-common';
import type { VisualizeUserContent } from '../components/visualize_listing';

const mockItem: VisualizeUserContent = {
  id: '9886b410-4c8b-11e8-b3d7-01146121b73d',
  updatedAt: '2025-10-09T20:35:02.807Z',
  managed: false,
  references: [],
  type: 'visualization',
  icon: 'visBarVertical',
  savedObjectType: 'visualization',
  typeTitle: 'Vertical bar',
  title: '[Flights] Delay Buckets',
  error: '',
  editor: {
    editUrl: '/edit/9886b410-4c8b-11e8-b3d7-01146121b73d',
  },
  attributes: {
    id: '9886b410-4c8b-11e8-b3d7-01146121b73d',
    title: '[Flights] Delay Buckets',
    description: '',
    readOnly: false,
  },
};

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
  const getVisualizeListItemLink = getVisualizeListItemLinkFn(application, kbnUrlStateStorage);

  test('returns undefined if readOnly', async () => {
    const testItem: VisualizeUserContent = {
      ...mockItem,
      attributes: {
        ...mockItem.attributes,
        readOnly: true,
      },
    };
    const url = getVisualizeListItemLink(testItem);
    expect(url).toBe(undefined);
  });

  test('returns undefined if has error', async () => {
    const testItem: VisualizeUserContent = {
      ...mockItem,
      attributes: {
        ...mockItem.attributes,
        error: 'error here',
      },
    };
    const url = getVisualizeListItemLink(testItem);
    expect(url).toBe(undefined);
  });

  test('returns undefined if onEdit is in editor', async () => {
    const testItem: VisualizeUserContent = {
      ...mockItem,
      editor: { onEdit: async () => {} },
    };
    const url = getVisualizeListItemLink(testItem);
    expect(url).toBe(undefined);
  });

  test('returns undefined if no editor', async () => {
    const testItem: VisualizeUserContent = {
      ...mockItem,
      editor: undefined,
    };
    const url = getVisualizeListItemLink(testItem);
    expect(url).toBe(undefined);
  });

  test('creates a link to classic visualization if editApp is not defined', async () => {
    const editUrl = 'edit/id';
    const testItem: VisualizeUserContent = {
      ...mockItem,
      editor: {
        editUrl,
      },
    };
    const url = getVisualizeListItemLink(testItem);
    expect(url).toBe(`/app/visualize#${editUrl}?_g=(time:(from:now-7d,to:now))`);
  });

  test('creates a link for the app given if editApp is defined', async () => {
    const editUrl = '#/edit/id';
    const editApp = 'lens';
    const testItem: VisualizeUserContent = {
      ...mockItem,
      editor: {
        editUrl,
        editApp,
      },
    };
    const url = getVisualizeListItemLink(testItem);
    expect(url).toBe(`/app/${editApp}${editUrl}?_g=(time:(from:now-7d,to:now))`);
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
      const testItem: VisualizeUserContent = {
        ...mockItem,
        editor: {
          editUrl,
          editApp,
        },
      };
      const url = getVisualizeListItemLink(testItem);
      expect(url).toBe(
        `/app/${editApp}${editUrl}?_g=(time:(from:'2021-01-05T11:45:53.375Z',to:'2021-01-21T11:46:00.990Z'))`
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
      const testItem: VisualizeUserContent = {
        ...mockItem,
        editor: {
          editUrl,
          editApp,
        },
      };
      const url = getVisualizeListItemLink(testItem);
      expect(url).toBe(`/app/${editApp}${editUrl}?_g=(refreshInterval:(pause:!f,value:300))`);
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
      const testItem: VisualizeUserContent = {
        ...mockItem,
        editor: {
          editUrl,
          editApp,
        },
      };
      const url = getVisualizeListItemLink(testItem);
      expect(url).toBe(
        `/app/${editApp}${editUrl}?_g=(filters:!((meta:(alias:!n,disabled:!f,negate:!f),query:(query:q1)),('$state':(store:globalState),meta:(alias:!n,disabled:!f,negate:!f),query:(query:q1))))`
      );
    });
  });
});
