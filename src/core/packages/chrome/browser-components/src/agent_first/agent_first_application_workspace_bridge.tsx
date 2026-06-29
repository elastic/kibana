/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import { registerBeforeNavigateToApp } from '@kbn/ui-chrome-layout-constants';
import { useChromeService } from '@kbn/core-chrome-browser-context';

const AGENT_BUILDER_APP_ID = 'agentBuilder';

/**
 * Reopens the application workspace when navigating to a native app in agent-first chrome.
 */
export const AgentFirstApplicationWorkspaceBridge = () => {
  const chrome = useChromeService();

  useEffect(() => {
    return registerBeforeNavigateToApp((appId) => {
      if (appId !== AGENT_BUILDER_APP_ID) {
        chrome.applicationWorkspace.open();
      }
    });
  }, [chrome]);

  return null;
};
