/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { encode } from '@kbn/rison';

export interface CustomQuery {
  kind: 'kuery' | 'lucene';
  expression: string;
}

export interface TimelineRedirectArgs {
  from?: string;
  to?: string;
  eventId?: string;
  index: string;
  baseURL: string;
  /**
   * When true, omits the `timelineFlyout` URL param (which drives the old expandable flyout) and
   * instead adds `flyoutDocumentId`/`flyoutDocumentIndex` params so the alerts page opens the new
   * (EUI-based) flyout imperatively while still opening the timeline for context.
   */
  useNewFlyout?: boolean;
}

export const getSecurityTimelineRedirectUrl = ({
  from,
  to,
  index,
  eventId,
  baseURL,
  useNewFlyout = false,
}: TimelineRedirectArgs) => {
  let timelineTimerangeSearchParam = {};
  if (from && to) {
    timelineTimerangeSearchParam = {
      timeline: {
        timerange: {
          from,
          to,
          kind: 'absolute',
          linkTo: false,
        },
      },
    };
  }

  const query: CustomQuery = {
    kind: 'kuery',
    expression: `_id: ${eventId}`,
  };

  const timelineSearchParam = {
    activeTab: 'query',
    query,
    isOpen: true,
  };

  const encodedTimelineParam = encode(timelineSearchParam);
  const encodedTimelineTimerangeParam = encode(timelineTimerangeSearchParam);

  if (useNewFlyout) {
    const urlParams = new URLSearchParams({
      timeline: encodedTimelineParam,
      timerange: encodedTimelineTimerangeParam,
      flyoutDocumentId: eventId ?? '',
      flyoutDocumentIndex: index,
    });
    return `${baseURL}?${urlParams.toString()}`;
  }

  const timelineFlyoutSearchParam = {
    right: {
      id: 'document-details-right',
      params: {
        id: eventId,
        indexName: index,
        scopeId: 'timeline-1',
      },
    },
  };

  const urlParams = new URLSearchParams({
    timeline: encodedTimelineParam,
    timerange: encodedTimelineTimerangeParam,
    timelineFlyout: encode(timelineFlyoutSearchParam),
  });

  return `${baseURL}?${urlParams.toString()}`;
};
