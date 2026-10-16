/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { managementPluginMock } from '@kbn/management-plugin/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { BackgroundSearchNotifier } from './background_search_notifier';
import { BACKGROUND_SESSION_POLLING_INTERVAL } from './constants';
import { SearchSessionsManagementPlugin } from './plugin';
import { openSearchSessionsFlyout } from './sessions_mgmt/flyout/get_flyout';

jest.mock('./background_search_notifier');
const BackgroundSearchNotifierMock = jest.mocked(BackgroundSearchNotifier);

jest.mock('./sessions_mgmt/flyout/get_flyout');
const openSearchSessionsFlyoutMock = jest.mocked(openSearchSessionsFlyout);

const setupPlugin = ({ enabled }: { enabled: boolean }) => {
  const plugin = new SearchSessionsManagementPlugin(coreMock.createPluginInitializerContext());
  const data = dataPluginMock.createSetupContract();
  data.search.sessionsConfig = { ...data.search.sessionsConfig, enabled };
  const management = managementPluginMock.createSetupContract();
  plugin.setup(coreMock.createSetup(), { data, management });
  const start = plugin.start(coreMock.createStart(), {
    data: dataPluginMock.createStartContract(),
    share: sharePluginMock.createStartContract(),
  });
  return { plugin, management, start };
};

describe('SearchSessionsManagementPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when search sessions are enabled', () => {
    it('registers the management app', () => {
      const { management } = setupPlugin({ enabled: true });
      expect(management.sections.section.kibana.registerApp).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'search_sessions' })
      );
    });

    it('starts background search notifier polling', () => {
      setupPlugin({ enabled: true });
      expect(BackgroundSearchNotifierMock.prototype.startPolling).toHaveBeenCalledWith(
        BACKGROUND_SESSION_POLLING_INTERVAL
      );
    });

    it('stops polling on stop', () => {
      const { plugin } = setupPlugin({ enabled: true });
      plugin.stop();
      expect(BackgroundSearchNotifierMock.prototype.stopPolling).toHaveBeenCalledTimes(1);
    });

    it('lazily loads and opens the flyout', async () => {
      const openFlyout = jest.fn();
      openSearchSessionsFlyoutMock.mockReturnValue(openFlyout);
      const { start } = setupPlugin({ enabled: true });
      const attrs = { appId: 'discover', trackingProps: { openedFrom: 'test' } };

      start.openFlyout(attrs);

      await waitFor(() => expect(openFlyout).toHaveBeenCalledWith(attrs));
    });
  });

  describe('when search sessions are disabled', () => {
    it('does not register the management app', () => {
      const { management } = setupPlugin({ enabled: false });
      expect(management.sections.section.kibana.registerApp).not.toHaveBeenCalled();
    });

    it('does not start background search notifier polling', () => {
      setupPlugin({ enabled: false });
      expect(BackgroundSearchNotifierMock).not.toHaveBeenCalled();
    });
  });
});
