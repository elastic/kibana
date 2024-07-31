/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { isError } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';
import { CliOptions } from '../types';
import { KibanaAPIClient } from './kibana_api_client';

export async function createPrivateLocation(
  { kibanaUrl, kibanaPassword, kibanaUsername, locationName }: CliOptions,
  logger: ToolingLog,
  kibanaApiClient: KibanaAPIClient,
  agentPolicyId: string
) {
  try {
    const response = await kibanaApiClient.sendRequest({
      method: 'post',
      url: 'api/synthetics/private_locations',
      data: {
        label: locationName,
        agentPolicyId,
      },
    });

    logger.info(`Synthetics private location created successfully`);
    return response.data;
  } catch (error) {
    if (isError(error)) {
      logger.error(`Error creating synthetics private location: ${error.message} ${error.stack}`);
    }
    throw error;
  }
}
