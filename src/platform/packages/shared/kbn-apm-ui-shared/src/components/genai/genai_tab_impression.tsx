/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef } from 'react';
import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core/public';

/**
 * Reported when a GenAI tab is rendered in a tab bar, i.e. the user saw the
 * tab. Since the tab only shows up for documents carrying `gen_ai.*`
 * attributes, this provides the denominator for its adoption: users who saw
 * the tab (impressions) vs. users who opened it (`viewGenAi` click events).
 */
export const GENAI_TAB_IMPRESSION_EVENT_TYPE = 'genai_tab_impression';

export interface GenAiTabImpressionEvent {
  /**
   * Host surface where the tab was rendered; matches the `data-ebt-element`
   * of the surface's `viewGenAi` click events so impressions and clicks can
   * be correlated.
   */
  element: string;
}

export const registerGenAiTabImpressionEventType = (
  analytics: Pick<AnalyticsServiceSetup, 'registerEventType'>
) => {
  analytics.registerEventType<GenAiTabImpressionEvent>({
    eventType: GENAI_TAB_IMPRESSION_EVENT_TYPE,
    schema: {
      element: {
        type: 'keyword',
        _meta: {
          description:
            'Host surface where the GenAI tab was rendered; matches the element of the surface `viewGenAi` click events.',
        },
      },
    },
  });
};

export interface GenAiTabImpressionProps {
  reportEvent: AnalyticsServiceStart['reportEvent'];
  /**
   * Host surface where the tab is rendered; use the same value as the
   * `data-ebt-element` of the surface's `viewGenAi` click attributes.
   */
  element: string;
  /**
   * Identifies the document the tab bar belongs to (e.g. the span or
   * transaction id), so paging to another document on a mounted surface
   * reports a new impression while re-renders of the same one do not.
   */
  resourceId?: string;
}

/**
 * Renders nothing and reports a `genai_tab_impression` event once per
 * (element, resourceId). Render it alongside the GenAI tab title (e.g. via
 * the tab `prepend`) so it mounts exactly when the tab shows up in a tab bar.
 */
export function GenAiTabImpression({ reportEvent, element, resourceId }: GenAiTabImpressionProps) {
  const lastReportedKeyRef = useRef<string>();

  useEffect(() => {
    const impressionKey = [element, resourceId].filter(Boolean).join('|');

    if (lastReportedKeyRef.current === impressionKey) {
      return;
    }
    lastReportedKeyRef.current = impressionKey;

    try {
      reportEvent<GenAiTabImpressionEvent>(GENAI_TAB_IMPRESSION_EVENT_TYPE, { element });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Error reporting event ${GENAI_TAB_IMPRESSION_EVENT_TYPE}:`, error);
    }
  }, [element, reportEvent, resourceId]);

  return null;
}
