/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import axios from 'axios';
import { ToolingLog } from '@kbn/dev-utils';

export async function getNodeShasums(log: ToolingLog, nodeVersion: string) {
  const url = `https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/dist/v${nodeVersion}/SHASUMS256.txt`;

  log.debug('Downloading shasum values for node version', nodeVersion, 'from', url);

  const { status, data } = await axios.get(url);

  if (status !== 200) {
    throw new Error(`${url} failed with a ${status} response`);
  }

  return data
    .toString('utf8')
    .split('\n')
    .reduce((acc: Record<string, string>, line: string) => {
      const [sha, platform] = line.split('  ');

      return {
        ...acc,
        [platform]: sha,
      };
    }, {});
}
