/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ISessionsClient } from '../../../..';
import { SearchSessionsMgmtAPI } from '../lib/api';
import type { SearchUsageCollector } from '../../../collectors';
import type { SearchSessionsConfigSchema } from '../../../../../server/config';
import { Flyout } from './flyout';

export function openSearchSessionsFlyout({
  coreStart,
  kibanaVersion,
  usageCollector,
  config,
  sessionsClient,
  share,
}: {
  coreStart: CoreStart;
  kibanaVersion: string;
  usageCollector: SearchUsageCollector;
  config: SearchSessionsConfigSchema;
  sessionsClient: ISessionsClient;
  share: SharePluginStart;
}) {
  return () => {
    const api = new SearchSessionsMgmtAPI(sessionsClient, config, {
      notifications: coreStart.notifications,
      application: coreStart.application,
      usageCollector,
    });
    const { Provider: KibanaReactContextProvider } = createKibanaReactContext(coreStart);

    const flyout = coreStart.overlays.openFlyout(
      toMountPoint(
        coreStart.rendering.addContext(
          <KibanaReactContextProvider>
            <Flyout
              onClose={() => flyout.close()}
              api={api}
              coreStart={coreStart}
              usageCollector={usageCollector}
              config={config}
              kibanaVersion={kibanaVersion}
              locators={share.url.locators}
            />
          </KibanaReactContextProvider>
        ),
        coreStart
      ),
      {
        hideCloseButton: true,
        size: 's',
      }
    );

    return { flyout };
  };
}
