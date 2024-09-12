/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { EuiTab, EuiTabs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useConnectionDetailsOpts, useConnectionDetailsService } from './context';
import { useBehaviorSubject } from './hooks/use_behavior_subject';
import { TabID } from './types';

export const Tabs: React.FC = () => {
  type Tab = [id: TabID, name: string];

  const ctx = useConnectionDetailsOpts();
  const service = useConnectionDetailsService();
  const tab = useBehaviorSubject(service.tabId$);

  const tabs: Tab[] = [];

  if (ctx.endpoints) {
    tabs.push([
      'endpoints',
      i18n.translate('cloud.connectionDetails.tab.endpoints', {
        defaultMessage: 'Endpoints',
      }),
    ]);
  }

  if (ctx.apiKeys) {
    tabs.push([
      'apiKeys',
      i18n.translate('cloud.connectionDetails.tab.apiKeys', {
        defaultMessage: 'API key',
      }),
    ]);
  }

  if (tabs.length === 0) {
    return null;
  }

  return (
    <EuiTabs>
      {tabs.map(([id, name]) => (
        <EuiTab
          key={id}
          onClick={() => service.setTab(id)}
          isSelected={tab === id}
          data-test-subj={`connectionDetailsTabBtn-${id}`}
        >
          {name}
        </EuiTab>
      ))}
    </EuiTabs>
  );
};
