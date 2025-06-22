/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { encode } from '@kbn/rison';
import { EcsFlat } from '@elastic/ecs';
import * as i18n from '../translations';

export interface CustomQuery {
  kind: 'kuery' | 'lucene';
  expression: string;
}

export type EcsAllowedValue = (typeof EcsFlat)['event.category']['allowed_values'][0];

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

/**
 * Helper function to return the description of an allowed value of the specified field
 * @param fieldName
 * @param value
 * @returns ecs description of the value
 */
export const getEcsAllowedValueDescription = (value: string): string => {
  const allowedValues: EcsAllowedValue[] = EcsFlat['event.category']?.allowed_values ?? [];
  const result =
    allowedValues?.find((item) => item.name === value)?.description ?? i18n.noEcsDescriptionReason;
  return result;
};
