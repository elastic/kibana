/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import axios from 'axios';

export async function waitUntilAPIReady(url: string, log: ToolingLog): Promise<void> {
  try {
    const maxRetries = 60;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        await axios.get(url);
        return; // API is ready, exit the loop
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          throw new Error(`Failed to wait for API at ${url} to be ready.`);
        } else {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }
  } catch (error) {
    log.error(error);
  }
}
