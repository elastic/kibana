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
import { reportFlyoutViewedEvent, type FlyoutViewedContent } from './flyout_viewed_event';

/**
 * Parameters used for emitting a `flyout_viewed` event from a React component.
 *
 * @property content - Flyout content being viewed.
 * @property tabId - Active tab identifier within the flyout (content-specific).
 */
export interface TrackFlyoutViewedParams {
  content?: FlyoutViewedContent;
  tabId?: string;
}

/**
 * Reports a `flyout_viewed` event whenever `content` or `tabId` changes.
 */
export const useTrackFlyoutViewed = ({ content, tabId }: TrackFlyoutViewedParams) => {
  const { analytics } = getUnifiedDocViewerServices();

  useEffect(() => {
    if (!content) return;

    reportFlyoutViewedEvent(analytics, { content, tabId });
  }, [analytics, content, tabId]);
};
