/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import { Flyout } from './flyout';
import { coreMock } from '@kbn/core/public/mocks';
import moment from 'moment';
import { createSearchUsageCollectorMock } from '../../../collectors/mocks';
import { SearchSessionsMgmtAPI } from '../lib/api';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { SessionsClient } from '../../sessions_client';
import { userEvent } from '@testing-library/user-event';
import { getSearchSessionEBTManagerMock } from '../../mocks';

const setup = () => {
  const mockCoreSetup = coreMock.createSetup();
  const mockCoreStart = coreMock.createStart();
  const mockConfig = {
    defaultExpiration: moment.duration('7d'),
    management: {
      expiresSoonWarning: moment.duration(1, 'days'),
      maxSessions: 2000,
      refreshInterval: moment.duration(1, 'seconds'),
      refreshTimeout: moment.duration(10, 'minutes'),
    },
  } as any;
  const mockShareStart = sharePluginMock.createStartContract();

  const kibanaVersion = '8.0.0';
  const mockSearchUsageCollector = createSearchUsageCollectorMock();

  const sessionsClient = new SessionsClient({
    http: mockCoreSetup.http,
  });
  const api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
    notifications: mockCoreStart.notifications,
    application: mockCoreStart.application,
    featureFlags: mockCoreStart.featureFlags,
  });

  const onClose = jest.fn();
  const user = userEvent.setup();

  render(
    <IntlProvider>
      <Flyout
        flyoutId="test"
        onClose={onClose}
        api={api}
        config={mockConfig}
        coreStart={mockCoreStart}
        kibanaVersion={kibanaVersion}
        locators={mockShareStart.url.locators}
        usageCollector={mockSearchUsageCollector}
        ebtManager={getSearchSessionEBTManagerMock()}
        trackingProps={{ openedFrom: 'test' }}
      />
    </IntlProvider>
  );

  return { onClose, user };
};

describe('<Flyout />', () => {
  it('render the title', () => {
    setup();
    expect(screen.getByText('Background searches')).toBeVisible();
  });

  it('renders the table', () => {
    setup();
    expect(screen.getByTestId('searchSessionsMgmtUiTable')).toBeVisible();
  });

  it('renders the expected columns', () => {
    setup();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
  });

  describe('when the footer close button is clicked', () => {
    it('calls the onClose callback', async () => {
      const { onClose, user } = setup();
      const closeButton = screen.getByText('Close');
      await user.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    });
  });
});
