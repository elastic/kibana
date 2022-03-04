/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/dev-utils';
import { downloadToString } from '../../lib/download';

export async function getNodeShasums(log: ToolingLog, nodeVersion: string) {
  const url = `https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/dist/v${nodeVersion}/SHASUMS256.txt`;

  log.debug('Downloading shasum values for node version', nodeVersion, 'from', url);

  const checksum = await downloadToString({ log, url, expectStatus: 200 });

  return checksum.split('\n').reduce((acc: Record<string, string>, line: string) => {
    const [sha, platform] = line.split('  ');

    return {
      ...acc,
      [platform]: sha,
    };
  }, {});
}
