/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { makeKibanaRequest } from './utils/make_kibana_request';
import { streamsListFeaturesStepCommonDefinition } from '../../../common/steps/streams';
import { createServerStepDefinition } from '../../step_registry/types';

interface ListFeaturesResponse {
  features: Array<Record<string, unknown>>;
}

export const streamsListFeaturesStepDefinition = createServerStepDefinition({
  ...streamsListFeaturesStepCommonDefinition,
  handler: async (context) => {
    try {
      const { name, type } = context.input;
      const workflowContext = context.contextManager.getContext();
      const fakeRequest = context.contextManager.getFakeRequest();

      context.logger.debug(`Fetching features for stream: ${name}`);

      const response = await makeKibanaRequest<ListFeaturesResponse>({
        kibanaUrl: workflowContext.kibanaUrl,
        path: `/internal/streams/${encodeURIComponent(name)}/features`,
        method: 'GET',
        query: {
          type,
        },
        fakeRequest,
        abortSignal: context.abortSignal,
      });

      context.logger.debug(
        `Successfully fetched ${response.features.length} features for stream: ${name}`
      );

      return {
        output: {
          features: response.features,
        },
      };
    } catch (error) {
      context.logger.error('Failed to list features', error as Error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to list features'),
      };
    }
  },
});
