/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MockedKeys } from '@kbn/utility-types-jest';
import { act, waitFor } from '@testing-library/react';
import { mount, ReactWrapper } from 'enzyme';
import { CoreSetup, CoreStart } from '@kbn/core/public';
import moment from 'moment';
import React from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import { SearchUsageCollector, SessionsClient } from '../../../..';
import { SearchSessionStatus } from '../../../../../../common';
import { SearchSessionsMgmtAPI } from '../../lib/api';
import { LocaleWrapper } from '../../__mocks__';
import { SearchSessionsMgmtTable } from './table';
import { SharePluginStart } from '@kbn/share-plugin/public';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { SearchSessionsConfigSchema } from '../../../../../../config';
import { createSearchUsageCollectorMock } from '../../../../collectors/mocks';

let mockCoreSetup: MockedKeys<CoreSetup>;
let mockCoreStart: CoreStart;
let mockShareStart: jest.Mocked<SharePluginStart>;
let mockConfig: SearchSessionsConfigSchema;
let sessionsClient: SessionsClient;
let api: SearchSessionsMgmtAPI;
let mockSearchUsageCollector: SearchUsageCollector;

describe('Background Search Session Management Table', () => {
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
    mockSearchUsageCollector = createSearchUsageCollectorMock();

    sessionsClient = new SessionsClient({ http: mockCoreSetup.http });
    api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
      locators: mockShareStart.url.locators,
      notifications: mockCoreStart.notifications,
      application: mockCoreStart.application,
    });
  });

  describe('renders', () => {
    let table: ReactWrapper;

    const getInitialResponse = () => {
      return {
        saved_objects: [
          {
            id: 'wtywp9u2802hahgp-flps',
            attributes: {
              name: 'very background search',
              id: 'wtywp9u2802hahgp-flps',
              url: '/app/great-app-url/#48',
              appId: 'canvas',
              status: SearchSessionStatus.IN_PROGRESS,
              created: '2020-12-02T00:19:32Z',
              expires: '2020-12-07T00:19:32Z',
              idMapping: {},
            },
          },
        ],
      };
    };

    test('table header cells', async () => {
      sessionsClient.find = jest.fn().mockImplementation(async () => {
        return getInitialResponse();
      });

      await act(async () => {
        table = mount(
          <LocaleWrapper>
            <SearchSessionsMgmtTable
              core={mockCoreStart}
              api={api}
              timezone="UTC"
              config={mockConfig}
              kibanaVersion={'8.0.0'}
              searchUsageCollector={mockSearchUsageCollector}
            />
          </LocaleWrapper>
        );
      });

      expect(table.find('thead th .euiTableCellContent__text').map((node) => node.text()))
        .toMatchInlineSnapshot(`
        Array [
          "App",
          "Name",
          "# Searches",
          "Status",
          "Created",
          "Expiration",
        ]
      `);
    });

    test('table body cells', async () => {
      sessionsClient.find = jest.fn().mockImplementation(async () => {
        return getInitialResponse();
      });

      await act(async () => {
        table = mount(
          <LocaleWrapper>
            <SearchSessionsMgmtTable
              core={mockCoreStart}
              api={api}
              timezone="UTC"
              config={mockConfig}
              kibanaVersion={'8.0.0'}
              searchUsageCollector={mockSearchUsageCollector}
            />
          </LocaleWrapper>
        );
      });
      table.update();

      expect(table.find('tbody td').map((node) => node.text())).toMatchInlineSnapshot(`
        Array [
          "App",
          "Namevery background search Info",
          "# Searches0",
          "StatusExpired",
          "Created2 Dec, 2020, 00:19:32",
          "Expiration--",
          "",
          "",
        ]
      `);
    });
  });

  // FLAKY: https://github.com/elastic/kibana/issues/88928
  describe.skip('fetching sessions data', () => {
    test('re-fetches data', async () => {
      jest.useFakeTimers();
      sessionsClient.find = jest.fn();
      mockConfig = {
        ...mockConfig,
        management: {
          ...mockConfig.management,
          refreshInterval: moment.duration(10, 'seconds'),
        },
      };

      await act(async () => {
        mount(
          <LocaleWrapper>
            <SearchSessionsMgmtTable
              core={mockCoreStart}
              api={api}
              timezone="UTC"
              config={mockConfig}
              kibanaVersion={'8.0.0'}
              searchUsageCollector={mockSearchUsageCollector}
            />
          </LocaleWrapper>
        );
        jest.advanceTimersByTime(20000);
      });

      // 1 for initial load + 2 refresh calls
      expect(sessionsClient.find).toBeCalledTimes(3);

      jest.useRealTimers();
    });

    test('refresh button uses the session client', async () => {
      sessionsClient.find = jest.fn();

      mockConfig = {
        ...mockConfig,
        management: {
          ...mockConfig.management,
          refreshInterval: moment.duration(1, 'day'),
          refreshTimeout: moment.duration(2, 'days'),
        },
      };

      await act(async () => {
        const table = mount(
          <LocaleWrapper>
            <SearchSessionsMgmtTable
              core={mockCoreStart}
              api={api}
              timezone="UTC"
              config={mockConfig}
              kibanaVersion={'8.0.0'}
              searchUsageCollector={mockSearchUsageCollector}
            />
          </LocaleWrapper>
        );

        const buttonSelector = `[data-test-subj="sessionManagementRefreshBtn"] button`;

        await waitFor(() => {
          table.find(buttonSelector).first().simulate('click');
          table.update();
        });
      });

      // initial call + click
      expect(sessionsClient.find).toBeCalledTimes(2);
    });
  });
});
