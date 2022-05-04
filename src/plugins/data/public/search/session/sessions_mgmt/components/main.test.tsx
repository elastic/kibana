/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MockedKeys } from '@kbn/utility-types/jest';
import { mount, ReactWrapper } from 'enzyme';
import { CoreSetup, CoreStart, DocLinksStart } from '@kbn/core/public';
import moment from 'moment';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { coreMock } from '@kbn/core/public/mocks';
import { SearchUsageCollector, SessionsClient } from '../../..';
import { SearchSessionsMgmtAPI } from '../lib/api';
import { AsyncSearchIntroDocumentation } from '../lib/documentation';
import { LocaleWrapper } from '../__mocks__';
import { SearchSessionsMgmtMain } from './main';
import { SharePluginStart } from '@kbn/share-plugin/public';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { SearchSessionsConfigSchema } from '../../../../../config';
import { createSearchUsageCollectorMock } from '../../../collectors/mocks';

let mockCoreSetup: MockedKeys<CoreSetup>;
let mockCoreStart: MockedKeys<CoreStart>;
let mockShareStart: jest.Mocked<SharePluginStart>;
let mockConfig: SearchSessionsConfigSchema;
let sessionsClient: SessionsClient;
let api: SearchSessionsMgmtAPI;
let mockSearchUsageCollector: SearchUsageCollector;

describe('Background Search Session Management Main', () => {
  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    mockCoreStart = coreMock.createStart();
    mockShareStart = sharePluginMock.createStartContract();
    mockSearchUsageCollector = createSearchUsageCollectorMock();
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

    api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
      locators: mockShareStart.url.locators,
      notifications: mockCoreStart.notifications,
      application: mockCoreStart.application,
    });
  });

  describe('renders', () => {
    const docLinks: DocLinksStart = {
      ELASTIC_WEBSITE_URL: `boo/`,
      DOC_LINK_VERSION: `#foo`,
      links: {
        search: { sessions: `mock-url` } as any,
      } as any,
    };

    let main: ReactWrapper;

    beforeEach(async () => {
      mockCoreSetup.uiSettings.get.mockImplementation((key: string) => {
        return key === 'dateFormat:tz' ? 'UTC' : null;
      });

      await act(async () => {
        main = mount(
          <LocaleWrapper>
            <SearchSessionsMgmtMain
              core={mockCoreStart}
              api={api}
              http={mockCoreSetup.http}
              timezone="UTC"
              documentation={new AsyncSearchIntroDocumentation(docLinks)}
              config={mockConfig}
              kibanaVersion={'8.0.0'}
              searchUsageCollector={mockSearchUsageCollector}
            />
          </LocaleWrapper>
        );
      });
    });

    test('page title', () => {
      expect(main.find('h1').text()).toBe('Search Sessions');
    });

    test('documentation link', () => {
      const docLink = main.find('a[href]').first();
      expect(docLink.text()).toBe('Documentation');
      expect(docLink.prop('href')).toBe('mock-url');
    });

    test('table is present', () => {
      expect(main.find(`[data-test-subj="search-sessions-mgmt-table"]`).exists()).toBe(true);
    });
  });
});
