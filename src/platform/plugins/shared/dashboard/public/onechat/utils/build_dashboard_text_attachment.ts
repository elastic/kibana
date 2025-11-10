/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TextAttachmentData } from '@kbn/onechat-common/attachments';
import type { DashboardApi } from '../../dashboard_api/types';
import { extractDashboardMetadata } from './extract_dashboard_state';
import { extractPanelInfo } from './extract_panel_info';
import { formatDashboardMarkdown } from './format_dashboard_markdown';

/**
 * Builds dashboard text attachment data using the text attachment type
 */
export function buildDashboardTextAttachment(
  dashboardApi: DashboardApi
): TextAttachmentData {
  const metadata = extractDashboardMetadata(dashboardApi);
  const panels = extractPanelInfo(dashboardApi);
  const markdown = formatDashboardMarkdown(metadata, panels);
  
  return {
    content: markdown,
  };
}

