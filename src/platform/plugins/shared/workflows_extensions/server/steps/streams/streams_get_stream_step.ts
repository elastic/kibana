/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { streamsGetStreamStepCommonDefinition } from '../../../common/steps/streams';
import { createServerStepDefinition } from '../../step_registry/types';
import { makeKibanaRequest } from './utils/make_kibana_request';

type GetStreamResponse = Record<string, unknown>;

export const streamsGetStreamStepDefinition = createServerStepDefinition({
  ...streamsGetStreamStepCommonDefinition,
  handler: async (context) => {
    try {
      const { name } = context.input;
      const workflowContext = context.contextManager.getContext();
      const fakeRequest = context.contextManager.getFakeRequest();

      context.logger.debug(`Fetching stream: ${name}`);

      const response = await makeKibanaRequest<GetStreamResponse>({
        kibanaUrl: workflowContext.kibanaUrl,
        path: `/api/streams/${encodeURIComponent(name)}`,
        method: 'GET',
        fakeRequest,
        abortSignal: context.abortSignal,
      });

      context.logger.debug(`Successfully fetched stream: ${name}`);

      return {
        output: {
          stream: response,
        },
      };
    } catch (error) {
      context.logger.error('Failed to get stream', error as Error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to get stream'),
      };
    }
  },
});
