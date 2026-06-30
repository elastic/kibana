/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const DISCOVER_SESSION_ATTACHMENT_TYPE = 'platform.discover.session';

export interface DiscoverSessionAttachmentData {
  dataViewTitle: string;
  dataViewId?: string;
  query?: string;
  queryLanguage: string;
  columns?: string[];
  dataSourceType?: string;
  timeRange?: { from: string; to: string };
  url: string;
  sessionTitle?: string;
  savedSearchId?: string;
  tabId?: string;
}

export const getDiscoverSessionAttachmentId = ({
  sessionId,
  tabId,
}: {
  sessionId?: string;
  tabId: string;
}) => (sessionId ? `discover-session-${sessionId}` : `discover-session-tab-${tabId}`);
