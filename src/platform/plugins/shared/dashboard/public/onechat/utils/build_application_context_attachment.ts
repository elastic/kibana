/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScreenContextAttachmentData } from '@kbn/onechat-common/attachments';
import type { DashboardApi } from '../../dashboard_api/types';
import { extractDashboardMetadata } from './extract_dashboard_state';

/**
 * Builds application context attachment data using the screen_context attachment type
 */
export function buildApplicationContextAttachment(
  dashboardApi: DashboardApi
): ScreenContextAttachmentData {
  const metadata = extractDashboardMetadata(dashboardApi);
  
  // Build description with key dashboard info
  const descriptionParts: string[] = [];
  if (metadata.name) {
    descriptionParts.push(`Dashboard: ${metadata.name}`);
  }
  if (metadata.mode) {
    descriptionParts.push(`Mode: ${metadata.mode}`);
  }
  if (metadata.timerange) {
    descriptionParts.push(`Time range: ${metadata.timerange.from} to ${metadata.timerange.to}`);
  }
  if (metadata.filters.length > 0) {
    descriptionParts.push(`${metadata.filters.length} filter(s) applied`);
  }
  
  const description = descriptionParts.length > 0 
    ? descriptionParts.join(' | ')
    : 'Dashboard context';

  // Build additional_data with detailed context
  const additionalData: Record<string, string> = {};
  
  if (metadata.id) {
    additionalData.dashboard_id = metadata.id;
  }
  if (metadata.name) {
    additionalData.name = metadata.name;
  }
  if (metadata.description) {
    additionalData.description = metadata.description;
  }
  additionalData.mode = metadata.mode;
  
  if (metadata.timerange) {
    additionalData.timerange_from = metadata.timerange.from;
    additionalData.timerange_to = metadata.timerange.to;
  }
  
  if (metadata.filters.length > 0) {
    additionalData.filters_count = String(metadata.filters.length);
    // Include filter details as JSON string
    additionalData.filters = JSON.stringify(
      metadata.filters.map((f) => ({
        key: f.meta?.key,
        value: f.meta?.value,
        negate: f.meta?.negate,
        disabled: f.meta?.disabled,
      }))
    );
  }
  
  // Add short instructions for the AI
  additionalData.instructions = 
    'You are assisting with a dashboard. You can help modify panels, change filters, update time ranges, and create new dashboards.';

  return {
    app: 'dashboard',
    description,
    additional_data: additionalData,
  };
}

