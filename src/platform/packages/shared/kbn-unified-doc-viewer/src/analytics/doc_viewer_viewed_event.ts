/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceStart } from '@kbn/core/public';
import { useEffect, useMemo, useRef } from 'react';
import { DOC_VIEWER_VIEWED_EVENT_TYPE, DOC_VIEWER_VIEWED_ROOT_CONTENT_ID } from './constants';
import type { DocViewRenderProps } from '../types';

/**
 * Payload for the `unified_doc_viewer_viewed` event.
 */
export interface DocViewerViewedEvent {
  /**
   * Identifies which doc viewer content is being viewed.
   */
  contentId: string;
  /**
   * Active tab identifier within the main content.
   */
  tabId?: string;
}

/**
 * Parameters for reporting a doc viewer viewed event.
 */
export interface UseDocViewerViewedEventParams
  extends Pick<AnalyticsServiceStart, 'reportEvent'>,
    DocViewerViewedEvent {
  /**
   * Additional values that participate in the deduplication key for the event.
   */
  keys?: string[];
  /**
   * Enables or disables event reporting.
   */
  enabled?: boolean;
  /**
   * Initial deduplication key to seed the last reported event state.
   */
  initialEventKey?: string;
  /**
   * Called after the deduplication key changes.
   */
  onEventKeyChange?: (eventKey: string) => void;
}

/**
 * Reports a viewed event for a doc viewer content area when its calculated event key changes.
 */
export const useDocViewerViewedEvent = ({
  reportEvent,
  contentId,
  tabId,
  keys,
  enabled = true,
  initialEventKey,
  onEventKeyChange,
}: UseDocViewerViewedEventParams) => {
  const lastReportedEventRef = useRef(initialEventKey);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const eventKey = [contentId, tabId, ...(keys ?? [])].filter(Boolean).join('|');

    if (lastReportedEventRef.current === eventKey) {
      return;
    }

    lastReportedEventRef.current = eventKey;

    try {
      onEventKeyChange?.(eventKey);
      reportEvent(DOC_VIEWER_VIEWED_EVENT_TYPE, {
        contentId,
        tabId,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Error reporting event ${DOC_VIEWER_VIEWED_EVENT_TYPE}:`, error);
    }
  }, [contentId, enabled, keys, onEventKeyChange, reportEvent, tabId]);
};

/**
 * Parameters for reporting a viewed event tied to the currently rendered doc viewer tab.
 */
export type UseDocViewerTabViewedEventParams = Omit<
  UseDocViewerViewedEventParams,
  'contentId' | 'keys' | 'enabled'
> &
  Pick<DocViewRenderProps, 'hit'>;

/**
 * Reports a viewed event for the active doc viewer tab.
 */
export const useDocViewerTabViewedEvent = ({
  hit,
  ...params
}: UseDocViewerTabViewedEventParams) => {
  const keys = useMemo(() => [hit.id], [hit.id]);

  useDocViewerViewedEvent({
    ...params,
    contentId: DOC_VIEWER_VIEWED_ROOT_CONTENT_ID,
    keys,
    enabled: Boolean(params.tabId),
  });
};
