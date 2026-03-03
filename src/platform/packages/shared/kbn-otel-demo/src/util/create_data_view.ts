/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import fetch from 'node-fetch';

interface CreateDataViewOptions {
  kibanaUrl: string;
  username: string;
  password: string;
  log: ToolingLog;
  title?: string;
  timeFieldName?: string;
}

/**
 * Creates a data view in Kibana for querying logs data.
 * Creates a data view with the pattern "logs,logs.*" by default.
 *
 * @param options - Configuration options including Kibana URL and credentials
 * @throws Error if the API call fails (except for already-exists case)
 */
export async function createDataView({
  kibanaUrl,
  username,
  password,
  log,
  title = 'logs,logs.*',
  timeFieldName = '@timestamp',
}: CreateDataViewOptions): Promise<void> {
  const url = `${kibanaUrl}/api/data_views/data_view`;

  log.info(`Creating data view "${title}" in Kibana...`);
  log.debug(`Calling POST ${url}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'kbn-xsrf': 'true',
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      },
      body: JSON.stringify({
        data_view: {
          title,
          timeFieldName,
        },
      }),
    });

    if (response.ok) {
      log.info(`Data view "${title}" created successfully`);
      return;
    }

    // Handle specific error cases
    const responseText = await response.text();

    // If data view already exists, that's fine (409 Conflict)
    if (response.status === 409) {
      log.info(`Data view "${title}" already exists`);
      return;
    }

    // Also check for duplicate title error in the response body
    if (responseText.includes('Duplicate') || responseText.includes('already exists')) {
      log.info(`Data view "${title}" already exists`);
      return;
    }

    // If the endpoint doesn't exist (older Kibana), warn but continue
    if (response.status === 404) {
      log.warning(
        'Data Views API not available. Make sure you are running a Kibana version that supports data views.'
      );
      return;
    }

    throw new Error(`Failed to create data view: ${response.status} ${responseText}`);
  } catch (error: any) {
    // Handle connection errors (Kibana not running)
    if (error.code === 'ECONNREFUSED') {
      log.warning(
        `Could not connect to Kibana at ${kibanaUrl}. Make sure Kibana is running before starting the OTel Demo.`
      );
      log.warning('Continuing without creating data view - you may need to create it manually.');
      return;
    }

    throw error;
  }
}
