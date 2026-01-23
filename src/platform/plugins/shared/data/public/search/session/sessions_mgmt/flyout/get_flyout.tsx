/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ISessionsClient } from '../../../..';
import { SearchSessionsMgmtAPI } from '../lib/api';
import type { SearchUsageCollector } from '../../../collectors';
import type { SearchSessionsConfigSchema } from '../../../../../server/config';
import { Flyout } from './flyout';
import type { BackgroundSearchOpenedHandler } from '../types';
import { FLYOUT_WIDTH } from './constants';
import type { ISearchSessionEBTManager } from '../../ebt_manager';

export function openSearchSessionsFlyout({
  coreStart,
  kibanaVersion,
  usageCollector,
  ebtManager,
  config,
  sessionsClient,
  share,
}: {
  coreStart: CoreStart;
  kibanaVersion: string;
  usageCollector: SearchUsageCollector;
  ebtManager: ISearchSessionEBTManager;
  config: SearchSessionsConfigSchema;
  sessionsClient: ISessionsClient;
  share: SharePluginStart;
}) {
  return (attrs: {
    appId: string;
    trackingProps: { openedFrom: string };
    onBackgroundSearchOpened?: BackgroundSearchOpenedHandler;
  }) => {
    const api = new SearchSessionsMgmtAPI(sessionsClient, config, {
      notifications: coreStart.notifications,
      application: coreStart.application,
      usageCollector,
      featureFlags: coreStart.featureFlags,
    });

    const flyout = coreStart.overlays.openSystemFlyout(
      <Flyout
        onClose={() => flyout.close()}
        onBackgroundSearchOpened={(params) => {
          attrs.onBackgroundSearchOpened?.(params);
          flyout.close();
        }}
        appId={attrs.appId}
        api={api}
        coreStart={coreStart}
        usageCollector={usageCollector}
        ebtManager={ebtManager}
        config={config}
        kibanaVersion={kibanaVersion}
        locators={share.url.locators}
        trackingProps={{ openedFrom: attrs.trackingProps.openedFrom }}
      />,
      {
        id: 'backgroundSearchesFlyout',
        title: i18n.translate('data.sessions.management.backgroundSearchesFlyoutTitle', {
          defaultMessage: 'Background searches',
        }),
        flyoutMenuProps: { hideTitle: false },
        size: FLYOUT_WIDTH,
        session: 'start',
        type: 'overlay',
        ownFocus: true,
        outsideClickCloses: true,
      }
    );

    return { flyout };
  };
}
