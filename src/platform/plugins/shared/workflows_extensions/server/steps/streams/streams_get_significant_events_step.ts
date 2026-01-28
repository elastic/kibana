/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { streamsGetSignificantEventsStepCommonDefinition } from '../../../common/steps/streams';
import { createServerStepDefinition } from '../../step_registry/types';
import { makeKibanaRequest } from './utils/make_kibana_request';

interface SignificantEventsResponse {
  significant_events: Array<Record<string, unknown>>;
  aggregated_occurrences: Array<{
    date: string;
    count: number;
  }>;
}

export const streamsGetSignificantEventsStepDefinition = createServerStepDefinition({
  ...streamsGetSignificantEventsStepCommonDefinition,
  handler: async (context) => {
    try {
      const { name, from, to, bucketSize, query } = context.input;
      const workflowContext = context.contextManager.getContext();
      const fakeRequest = context.contextManager.getFakeRequest();

      context.logger.debug(`Fetching significant events for stream: ${name}`);

      const response = await makeKibanaRequest<SignificantEventsResponse>({
        kibanaUrl: workflowContext.kibanaUrl,
        path: `/api/streams/${encodeURIComponent(name)}/significant_events`,
        method: 'GET',
        query: {
          from,
          to,
          bucketSize,
          query,
        },
        fakeRequest,
        abortSignal: context.abortSignal,
      });

      context.logger.debug(
        `Successfully fetched ${response.significant_events.length} significant events for stream: ${name}`
      );

      return {
        output: {
          significant_events: response.significant_events,
          aggregated_occurrences: response.aggregated_occurrences,
        },
      };
    } catch (error) {
      context.logger.error('Failed to get significant events', error as Error);
      return {
        error: new Error(
          error instanceof Error ? error.message : 'Failed to get significant events'
        ),
      };
    }
  },
});
