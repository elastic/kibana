/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';

interface EnableStreamsOptions {
  kibanaUrl: string;
  username: string;
  password: string;
  log: ToolingLog;
}

/**
 * Enables the streams feature in Kibana by calling the POST /api/streams/_enable endpoint.
 * This sets up the logs stream/index for receiving OTel data.
 *
 * @param options - Configuration options including Kibana URL and credentials
 * @throws Error if the API call fails (except for already-enabled case)
 */
export async function enableStreams({
  kibanaUrl,
  username,
  password,
  log,
}: EnableStreamsOptions): Promise<void> {
  const url = `${kibanaUrl}/api/streams/_enable`;

  log.info('Enabling streams (logs index) in Kibana...');
  log.debug(`Calling POST ${url}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'kbn-xsrf': 'true',
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      },
    });

    if (response.ok) {
      log.info('Streams enabled successfully');
      return;
    }

    // Handle specific error cases
    const responseText = await response.text();

    // If streams are already enabled, that's fine
    if (response.status === 400 && responseText.includes('already enabled')) {
      log.info('Streams already enabled');
      return;
    }

    // If the endpoint doesn't exist (older Kibana), warn but continue
    if (response.status === 404) {
      log.warning(
        'Streams API not available. Make sure you are running a Kibana version that supports streams.'
      );
      return;
    }

    throw new Error(`Failed to enable streams: ${response.status} ${responseText}`);
  } catch (error: any) {
    // Handle connection errors (Kibana not running)
    if (error.code === 'ECONNREFUSED') {
      log.warning(
        `Could not connect to Kibana at ${kibanaUrl}. Make sure Kibana is running before starting the OTel Demo.`
      );
      log.warning('Continuing without enabling streams - you may need to enable them manually.');
      return;
    }

    throw error;
  }
}
