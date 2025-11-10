/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DashboardApi } from '../../dashboard_api/types';
import type { CoreStart } from '@kbn/core/public';
import type { UiAttachment } from '@kbn/onechat-browser';
import type { BrowserApiToolDefinition } from '@kbn/onechat-browser/tools/browser_api_tool';
import { AttachmentType } from '@kbn/onechat-common/attachments';
import { buildApplicationContextAttachment } from '../utils/build_application_context_attachment';
import { buildDashboardTextAttachment } from '../utils/build_dashboard_text_attachment';
import { createDashboardBrowserApiTools } from '../tools';

export interface UseOnechatIntegrationResult {
  attachments: UiAttachment[];
  browserApiTools: BrowserApiToolDefinition<any>[];
}

/**
 * Hook to build onechat attachments and browser API tools from dashboard API
 */
export function useOnechatIntegration(
  dashboardApi: DashboardApi | undefined,
  coreStart: CoreStart
): UseOnechatIntegrationResult {
  return useMemo(() => {
    if (!dashboardApi) {
      return {
        attachments: [],
        browserApiTools: [],
      };
    }

    // Build attachments
    const applicationContextAttachment: UiAttachment = {
      id: 'dashboard-application-context',
      type: AttachmentType.screenContext,
      getContent: () => buildApplicationContextAttachment(dashboardApi),
    };

    const dashboardAttachment: UiAttachment = {
      id: 'dashboard-configuration',
      type: AttachmentType.text,
      getContent: () => buildDashboardTextAttachment(dashboardApi),
    };

    // Build browser API tools
    const browserApiTools = createDashboardBrowserApiTools(dashboardApi, coreStart);

    return {
      attachments: [applicationContextAttachment, dashboardAttachment],
      browserApiTools,
    };
  }, [dashboardApi, coreStart]);
}

