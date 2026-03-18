/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import { getUnifiedDocViewerServices } from '../plugin';
import {
  FLYOUT_VIEWED_EVENT_TYPE,
  type FlyoutViewedContent,
  type FlyoutViewedTabId,
} from './flyout_viewed_event';

export interface TrackFlyoutViewedParams {
  content?: FlyoutViewedContent;
  tabId?: FlyoutViewedTabId;
}

export const useTrackFlyoutViewed = ({ content, tabId }: TrackFlyoutViewedParams) => {
  const { analytics } = getUnifiedDocViewerServices();

  useEffect(() => {
    if (!content) return;

    analytics.reportEvent(FLYOUT_VIEWED_EVENT_TYPE, tabId ? { content, tabId } : { content });
  }, [analytics, content, tabId]);
};
