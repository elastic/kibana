/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { encode } from '@kbn/rison';

export interface TimelineRedirectArgs {
  from?: string;
  to?: string;
  query?: string;
}
export const getSecurityTimelineRedirectUrl = ({ from, to, query }: TimelineRedirectArgs) => {
  const BASE_PATH = '/app/security/timelines';

  let timelineTimerangeSearchParam = {};
  if (from && to) {
    timelineTimerangeSearchParam = {
      timeline: {
        from,
        to,
        linkTo: false,
      },
    };
  }

  const timelineSearchParam = {
    activeTab: 'query',
    query,
    open: true,
  };

  const encodedTimelineParam = encode(timelineSearchParam);
  const encodedTimelineTimerangeParam = encode(timelineTimerangeSearchParam);

  return `${BASE_PATH}?timeline=${encodedTimelineParam}&timeRange=${encodedTimelineTimerangeParam}`;
};
