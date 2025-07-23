/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DocLinksStart } from '@kbn/core/public';
import moment from 'moment';
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { SessionsClient } from '../../..';
import { SearchSessionsMgmtAPI } from '../lib/api';
import { AsyncSearchIntroDocumentation } from '../lib/documentation';
import { LocaleWrapper } from '../__mocks__';
import { SearchSessionsMgmtMain } from './main';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { createSearchUsageCollectorMock } from '../../../collectors/mocks';

jest.mock('../../constants', () => ({
  BACKGROUND_SEARCH_ENABLED: true,
}));

const setup = async () => {
  const mockCoreSetup = coreMock.createSetup();
  mockCoreSetup.uiSettings.get.mockImplementation((key: string) => {
    return key === 'dateFormat:tz' ? 'UTC' : null;
  });

  const mockCoreStart = coreMock.createStart();
  const mockShareStart = sharePluginMock.createStartContract();
  const mockSearchUsageCollector = createSearchUsageCollectorMock();
  const mockConfig = {
    defaultExpiration: moment.duration('7d'),
    management: {
      expiresSoonWarning: moment.duration(1, 'days'),
      maxSessions: 2000,
      refreshInterval: moment.duration(1, 'seconds'),
      refreshTimeout: moment.duration(10, 'minutes'),
    },
  } as any;

  const sessionsClient = new SessionsClient({ http: mockCoreSetup.http });

  const api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
    notifications: mockCoreStart.notifications,
    application: mockCoreStart.application,
  });

  const docLinks: DocLinksStart = {
    ELASTIC_WEBSITE_URL: `boo/`,
    DOC_LINK_VERSION: `#foo`,
    links: {
      search: { sessions: `mock-url` } as any,
    } as any,
  };

  await act(async () => {
    render(
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
          share={mockShareStart}
        />
      </LocaleWrapper>
    );
  });

  return {
    api,
    mockCoreStart,
    mockCoreSetup,
    mockSearchUsageCollector,
  };
};

describe('<SearchSessionsMgmtMain />', () => {
  describe('when Background Search is enabled', () => {
    it('should render the page title', async () => {
      await setup();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Background Search');
    });

    it('should render the documentation link', async () => {
      await setup();

      const docLink = screen.queryByText('Documentation');
      expect(docLink).not.toBeInTheDocument();
    });

    it('should render the table', async () => {
      await setup();

      const table = screen.getByTestId('searchSessionsMgmtUiTable');
      expect(table).toBeVisible();
    });
  });
});
