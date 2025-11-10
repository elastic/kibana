/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { DashboardApi } from '../../dashboard_api/types';
import { useOnechatIntegration } from './use_onechat_integration';
import { coreServices, onechatService } from '../../services/kibana_services';

/**
 * Hook to manage onechat integration for dashboard
 * Sets up the conversation flyout active config with dashboard context
 */
export function useDashboardOnechat(dashboardApi: DashboardApi | undefined) {
  const { attachments, browserApiTools } = useOnechatIntegration(dashboardApi, coreServices);

  useEffect(() => {
    if (!dashboardApi || !onechatService) {
      return;
    }

    // Set the active conversation config with dashboard attachments and tools
    onechatService.setConversationFlyoutActiveConfig({
      sessionTag: 'dashboard',
      agentId: 'test_agent',
      attachments,
      browserApiTools,
    });

    // Cleanup: clear the config when dashboard unmounts or changes
    return () => {
      if (onechatService) {
        onechatService.clearConversationFlyoutActiveConfig();
      }
    };
  }, [dashboardApi, attachments, browserApiTools]);
}

