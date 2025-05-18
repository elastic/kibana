/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { useConnectionDetailsService } from './context';
import { EndpointsTab } from './tabs/endpoints_tab';
import { ApiKeysTab } from './tabs/api_keys_tab';
import { useBehaviorSubject } from './hooks/use_behavior_subject';

export const ConnectionDetails: React.FC = () => {
  const service = useConnectionDetailsService();
  const tab = useBehaviorSubject(service.tabId$);

  switch (tab) {
    case 'endpoints':
      return <EndpointsTab />;
    case 'apiKeys':
      return <ApiKeysTab />;
    default:
      return null;
  }
};
