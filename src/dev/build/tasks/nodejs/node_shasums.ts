/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { downloadToString } from '../../lib/download';

const cache: Record<string, Record<string, string>> = {};

export async function getNodeShasums(log: ToolingLog, nodeVersion: string, variant: string | null) {
  let variantPath = '';
  if (variant === 'pointer-compression') variantPath = 'node-pointer-compression/';
  const url = `https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/${variantPath}dist/v${nodeVersion}/SHASUMS256.txt`;

  if (cache[url]) {
    log.debug('Returning cached shasum values for node version', nodeVersion, 'from', url);
    return cache[url];
  }

  log.debug('Downloading shasum values for node version', nodeVersion, 'from', url);

  const checksum = await downloadToString({ log, url, expectStatus: 200 });
  const result = checksum.split('\n').reduce((acc: Record<string, string>, line: string) => {
    const [sha, platform] = line.split('  ');

    return {
      ...acc,
      [platform]: sha,
    };
  }, {});
  cache[url] = result;
  return result;
}
