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
}

export const getSecurityTimelineRedirectUrl = ({
  from,
  to,
  index,
  eventId,
  baseURL,
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

  const encodedTimelineParam = encode(timelineSearchParam);
  const encodedTimelineTimerangeParam = encode(timelineTimerangeSearchParam);
  const encodedTimelineFlyoutParam = encode(timelineFlyoutSearchParam);

  const urlParams = new URLSearchParams({
    timeline: encodedTimelineParam,
    timerange: encodedTimelineTimerangeParam,
    timelineFlyout: encodedTimelineFlyoutParam,
  });

  return `${baseURL}?${urlParams.toString()}`;
};
