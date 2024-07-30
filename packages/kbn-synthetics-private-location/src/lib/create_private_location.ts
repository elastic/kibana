/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import https from 'https';
import axios from 'axios';
import { isError } from 'lodash';
import { KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import { ToolingLog } from '@kbn/tooling-log';
import { CliOptions } from '../types';

export async function createPrivateLocation(
  { kibanaUrl, kibanaPassword, kibanaUsername, locationName }: CliOptions,
  logger: ToolingLog,
  agentPolicyId: string
) {
  try {
    const isHTTPS = new URL(kibanaUrl).protocol === 'https:';
    const httpsAgent = isHTTPS
      ? new https.Agent({
          ca: fs.readFileSync(KBN_CERT_PATH),
          key: fs.readFileSync(KBN_KEY_PATH),
          // hard-coded set to false like in packages/kbn-cli-dev-mode/src/base_path_proxy_server.ts
          rejectUnauthorized: false,
        })
      : undefined;

    // Send the saved objects to Kibana using the _import API
    const response = await axios.post(
      `${kibanaUrl}/api/synthetics/private_locations`,
      {
        label: locationName,
        agentPolicyId,
      },
      {
        headers: {
          'kbn-xsrf': 'true',
          'elastic-api-version': '2023-10-31',
        },
        auth: {
          username: kibanaUsername,
          password: kibanaPassword,
        },
        httpsAgent,
      }
    );

    logger.info(`Synthetics private location created successfully`);
    return response.data;
  } catch (error) {
    if (isError(error)) {
      logger.error(`Error creating synthetics private location: ${error.message} ${error.stack}`);
    }
    throw error;
  }
}
