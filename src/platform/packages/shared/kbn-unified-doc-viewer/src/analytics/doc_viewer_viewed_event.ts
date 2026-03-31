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
   * When true, the next event key change is recorded for deduplication
   * but not reported. This is useful when a component tree is being restored
   * and the initial render should not emit a duplicate event.
   */
  skipNextReport?: boolean;
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
  skipNextReport,
}: UseDocViewerViewedEventParams) => {
  const lastReportedEventRef = useRef(initialEventKey);
  const skipNextReportRef = useRef(skipNextReport);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const eventKey = [contentId, tabId, ...(keys ?? [])].filter(Boolean).join('|');

    if (lastReportedEventRef.current === eventKey) {
      return;
    }

    lastReportedEventRef.current = eventKey;

    if (skipNextReportRef.current) {
      skipNextReportRef.current = false;
      return;
    }

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

/**
 * Parameters for reporting a viewed event tied to a span/log flyout.
 */
export type UseDocViewerSpanLogViewedEventParams = Omit<
  UseDocViewerViewedEventParams,
  'keys' | 'enabled'
> & {
  hit: DocViewRenderProps['hit'] | null;
};

/**
 * Reports a viewed event for a span/log flyout.
 * Deduplicates by including the span/log document id in the event key.
 */
export const useDocViewerSpanLogViewedEvent = ({
  hit,
  ...params
}: UseDocViewerSpanLogViewedEventParams) => {
  const keys = useMemo(() => (hit ? [hit.id] : undefined), [hit]);

  useDocViewerViewedEvent({
    ...params,
    keys,
    enabled: hit != null,
  });
};
