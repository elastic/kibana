/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiTableFieldDataColumnType } from '@elastic/eui';
import { MockedKeys } from '@kbn/utility-types/jest';
import { mount } from 'enzyme';
import { CoreSetup, CoreStart } from '@kbn/core/public';
import moment from 'moment';
import { ReactElement } from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import { SearchUsageCollector, SessionsClient } from '../../..';
import { SearchSessionStatus } from '../../../../../common';
import { OnActionComplete } from '../components';
import { UISession } from '../types';
import { SearchSessionsMgmtAPI } from './api';
import { getColumns } from './get_columns';
import { SharePluginStart } from '@kbn/share-plugin/public';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { SearchSessionsConfigSchema } from '../../../../../config';
import { createSearchUsageCollectorMock } from '../../../collectors/mocks';

let mockCoreSetup: MockedKeys<CoreSetup>;
let mockCoreStart: CoreStart;
let mockShareStart: jest.Mocked<SharePluginStart>;
let mockSearchUsageCollector: SearchUsageCollector;
let mockConfig: SearchSessionsConfigSchema;
let api: SearchSessionsMgmtAPI;
let sessionsClient: SessionsClient;
let handleAction: OnActionComplete;
let mockSession: UISession;

let tz = 'UTC';

describe('Search Sessions Management table column factory', () => {
  beforeEach(async () => {
    mockCoreSetup = coreMock.createSetup();
    mockCoreStart = coreMock.createStart();
    mockShareStart = sharePluginMock.createStartContract();
    mockConfig = {
      defaultExpiration: moment.duration('7d'),
      management: {
        expiresSoonWarning: moment.duration(1, 'days'),
        maxSessions: 2000,
        refreshInterval: moment.duration(1, 'seconds'),
        refreshTimeout: moment.duration(10, 'minutes'),
      },
    } as any;
    sessionsClient = new SessionsClient({ http: mockCoreSetup.http });
    mockSearchUsageCollector = createSearchUsageCollectorMock();

    api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
      locators: mockShareStart.url.locators,
      notifications: mockCoreStart.notifications,
      application: mockCoreStart.application,
    });
    tz = 'UTC';

    handleAction = () => {
      throw new Error('not testing handle action');
    };

    mockSession = {
      name: 'Cool mock session',
      id: 'wtywp9u2802hahgp-thao',
      reloadUrl: '/app/great-app-url',
      restoreUrl: '/app/great-app-url/#42',
      appId: 'discovery',
      numSearches: 3,
      status: SearchSessionStatus.IN_PROGRESS,
      created: '2020-12-02T00:19:32Z',
      expires: '2020-12-07T00:19:32Z',
      initialState: {},
      restoreState: {},
      version: '7.14.0',
    };
  });

  test('returns columns', () => {
    const columns = getColumns(
      mockCoreStart,
      api,
      mockConfig,
      tz,
      handleAction,
      '7.14.0',
      mockSearchUsageCollector
    );
    expect(columns).toMatchInlineSnapshot(`
      Array [
        Object {
          "field": "appId",
          "name": "App",
          "render": [Function],
          "sortable": true,
        },
        Object {
          "field": "name",
          "name": "Name",
          "render": [Function],
          "sortable": true,
          "width": "20%",
        },
        Object {
          "field": "numSearches",
          "name": "# Searches",
          "render": [Function],
          "sortable": true,
        },
        Object {
          "field": "status",
          "name": "Status",
          "render": [Function],
          "sortable": true,
        },
        Object {
          "field": "created",
          "name": "Created",
          "render": [Function],
          "sortable": true,
        },
        Object {
          "field": "expires",
          "name": "Expiration",
          "render": [Function],
          "sortable": true,
        },
        Object {
          "field": "status",
          "name": "",
          "render": [Function],
          "sortable": false,
        },
        Object {
          "field": "actions",
          "name": "",
          "render": [Function],
          "sortable": false,
        },
      ]
    `);
  });

  describe('name', () => {
    test('rendering', () => {
      const [, nameColumn] = getColumns(
        mockCoreStart,
        api,
        mockConfig,
        tz,
        handleAction,
        '7.14.0',
        mockSearchUsageCollector
      ) as Array<EuiTableFieldDataColumnType<UISession>>;

      const name = mount(nameColumn.render!(mockSession.name, mockSession) as ReactElement);

      expect(name.text()).toBe('Cool mock session');
    });

    describe('old version warning', () => {
      const currentKibanaVersion = '7.14.0';
      const olderKibanaVersion = '7.13.0';
      let hasRenderedVersionWarning: (partialSession: Partial<UISession>) => boolean;
      beforeEach(() => {
        const [, nameColumn] = getColumns(
          mockCoreStart,
          api,
          mockConfig,
          tz,
          handleAction,
          currentKibanaVersion,
          mockSearchUsageCollector
        ) as Array<EuiTableFieldDataColumnType<UISession>>;

        hasRenderedVersionWarning = (partialSession: Partial<UISession>): boolean => {
          const session: UISession = {
            ...mockSession,
            ...partialSession,
          };
          const node = mount(
            nameColumn.render!(session.name, session) as ReactElement
          ).getDOMNode();
          return !!node.querySelector('[data-test-subj="versionIncompatibleWarningTestSubj"]');
        };
      });

      test("don't render warning for the same version when can restore", () => {
        expect(
          hasRenderedVersionWarning({
            version: currentKibanaVersion,
            status: SearchSessionStatus.COMPLETE,
          })
        ).toBe(false);
      });

      test("don't render warning for the same version when can't restore", () => {
        expect(
          hasRenderedVersionWarning({
            version: currentKibanaVersion,
            status: SearchSessionStatus.EXPIRED,
          })
        ).toBe(false);
      });

      test('render a warning for a different version when can restore', () => {
        expect(
          hasRenderedVersionWarning({
            version: olderKibanaVersion,
            status: SearchSessionStatus.COMPLETE,
          })
        ).toBe(true);
      });

      test("don't render a warning for a different version when can't restore", () => {
        expect(
          hasRenderedVersionWarning({
            version: olderKibanaVersion,
            status: SearchSessionStatus.EXPIRED,
          })
        ).toBe(false);
      });
    });
  });

  // Num of searches column
  describe('num of searches', () => {
    test('renders', () => {
      const [, , numOfSearches] = getColumns(
        mockCoreStart,
        api,
        mockConfig,
        tz,
        handleAction,
        '7.14.0',
        mockSearchUsageCollector
      ) as Array<EuiTableFieldDataColumnType<UISession>>;

      const numOfSearchesLine = mount(
        numOfSearches.render!(mockSession.numSearches, mockSession) as ReactElement
      );
      expect(numOfSearchesLine.text()).toMatchInlineSnapshot(`"3"`);
    });
  });

  // Status column
  describe('status', () => {
    test('render in_progress', () => {
      const [, , , status] = getColumns(
        mockCoreStart,
        api,
        mockConfig,
        tz,
        handleAction,
        '7.14.0',
        mockSearchUsageCollector
      ) as Array<EuiTableFieldDataColumnType<UISession>>;

      const statusLine = mount(status.render!(mockSession.status, mockSession) as ReactElement);
      expect(
        statusLine.find('.euiText[data-test-subj="sessionManagementStatusTooltip"]').text()
      ).toMatchInlineSnapshot(`"In progress"`);
    });

    test('error handling', () => {
      const [, , , status] = getColumns(
        mockCoreStart,
        api,
        mockConfig,
        tz,
        handleAction,
        '7.14.0',
        mockSearchUsageCollector
      ) as Array<EuiTableFieldDataColumnType<UISession>>;

      mockSession.status = 'INVALID' as SearchSessionStatus;
      const statusLine = mount(status.render!(mockSession.status, mockSession) as ReactElement);

      // no unhandled error

      expect(statusLine.text()).toMatchInlineSnapshot(`"INVALID"`);
    });
  });

  // Start Date column
  describe('startedDate', () => {
    test('render using Browser timezone', () => {
      tz = 'Browser';

      const [, , , , createdDateCol] = getColumns(
        mockCoreStart,
        api,
        mockConfig,
        tz,
        handleAction,
        '7.14.0',
        mockSearchUsageCollector
      ) as Array<EuiTableFieldDataColumnType<UISession>>;

      const date = mount(createdDateCol.render!(mockSession.created, mockSession) as ReactElement);

      expect(date.text()).toBe('1 Dec, 2020, 19:19:32');
    });

    test('render using AK timezone', () => {
      tz = 'US/Alaska';

      const [, , , , createdDateCol] = getColumns(
        mockCoreStart,
        api,
        mockConfig,
        tz,
        handleAction,
        '7.14.0',
        mockSearchUsageCollector
      ) as Array<EuiTableFieldDataColumnType<UISession>>;

      const date = mount(createdDateCol.render!(mockSession.created, mockSession) as ReactElement);

      expect(date.text()).toBe('1 Dec, 2020, 15:19:32');
    });

    test('error handling', () => {
      const [, , , , createdDateCol] = getColumns(
        mockCoreStart,
        api,
        mockConfig,
        tz,
        handleAction,
        '7.14.0',
        mockSearchUsageCollector
      ) as Array<EuiTableFieldDataColumnType<UISession>>;

      mockSession.created = 'INVALID';
      const date = mount(createdDateCol.render!(mockSession.created, mockSession) as ReactElement);

      // no unhandled error
      expect(date.text()).toBe('Invalid date');
    });
  });
});
