/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fetch from 'node-fetch';

import { ToolingLog } from '@kbn/tooling-log';
import { write, Task } from '../lib';

const getAvailableVersions = async (log: ToolingLog) => {
  const options = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  // Endpoint maintained by the web-team and hosted on the elastic website
  // See https://github.com/elastic/website-development/issues/9331
  const url = 'https://www.elastic.co/content/product_versions';
  log.info('Fetching Elastic Agent versions list');
  const results = await fetch(url, options);
  const rawBody = await results.text();

  try {
    const jsonBody = JSON.parse(rawBody);

    const versions: string[] = (jsonBody.length ? jsonBody[0] : [])
      .filter((item: any) => item?.title?.includes('Elastic Agent'))
      .map((item: any) => item?.version_number);

    log.info(`Retrieved available Elastic Agent versions`);
    return versions;
  } catch (error) {
    log.warning(`Failed to fetch Elastic Agent versions list`);
    log.info(`Status: ${results.status}`);
    log.info(rawBody);
    if (process.env.BUILDKITE_PULL_REQUEST === 'true') {
      log.warning(error);
    } else {
      throw new Error(error);
    }
  }
  return [];
};

// Keep the elastic agent versions list in Fleet UI updated
export const FetchAgentVersionsList: Task = {
  description: 'Build list of available Elastic Agent versions for Fleet UI',

  async run(config, log, build) {
    const versionsList = await getAvailableVersions(log);
    const AGENT_VERSION_BUILD_FILE = 'x-pack/plugins/fleet/target/agent_versions_list.json';

    if (versionsList.length !== 0) {
      log.info(`Writing Elastic Agent versions list to ${AGENT_VERSION_BUILD_FILE}`);
      await write(
        build.resolvePath(AGENT_VERSION_BUILD_FILE),
        JSON.stringify(versionsList, null, '  ')
      );
    }
  },
};
