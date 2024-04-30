/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useConnectionDetailsOpts } from './context';
import { EndpointsTab } from './tabs/endpoints_tab';
import { ApiKeysTab } from './tabs/api_keys_tab';

export const ConnectionDetails: React.FC = () => {
  type TabID = 'endpoints' | 'apiKeys';
  type Tab = [id: TabID, name: string, content: React.ReactNode];

  const ctx = useConnectionDetailsOpts();
  const [tab, setTab] = React.useState<TabID>('endpoints');

  const tabs: Tab[] = [];

  if (ctx.endpoints) {
    tabs.push([
      'endpoints',
      i18n.translate('cloud.connectionDetails.tab.endpoints', {
        defaultMessage: 'Endpoints',
      }),
      <EndpointsTab />,
    ]);
  }

  if (ctx.apiKeys) {
    tabs.push([
      'apiKeys',
      i18n.translate('cloud.connectionDetails.tab.apiKeys', {
        defaultMessage: 'API key',
      }),
      <ApiKeysTab />,
    ]);
  }

  if (tabs.length === 0) {
    return null;
  }

  return (
    <>
      <EuiTabs>
        {tabs.map(([id, name]) => (
          <EuiTab
            key={id}
            onClick={() => setTab(id)}
            isSelected={tab === id}
            data-test-subj={`connectionDetailsTabBtn-${id}`}
          >
            {name}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer />
      {tabs.find(([id]) => id === tab)?.[2] || null}
    </>
  );
};
