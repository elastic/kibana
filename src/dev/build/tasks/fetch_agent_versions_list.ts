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

const isPr = () =>
  !!process.env.BUILDKITE_PULL_REQUEST && process.env.BUILDKITE_PULL_REQUEST !== 'false';

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

  try {
    const results = await fetch(url, options);
    const rawBody = await results.text();

    if (results.status >= 400) {
      throw new Error(`Status code ${results.status} received from versions API: ${rawBody}`);
    }

    const jsonBody = JSON.parse(rawBody);

    const versions: string[] = (jsonBody.length ? jsonBody[0] : [])
      .filter((item: any) => item?.title?.includes('Elastic Agent'))
      .map((item: any) => item?.version_number);

    log.info(`Retrieved available versions`);
    return versions;
  } catch (error) {
    const errorMessage = 'Failed to fetch Elastic Agent versions list';

    if (isPr()) {
      // For PR jobs, just log the error as a warning and continue
      log.warning(errorMessage);
      log.warning(error);
    } else {
      // For non-PR jobs like nightly builds, log the error to stderror and throw
      // to ensure the build fails
      log.error(errorMessage);
      throw new Error(error);
    }
  }
  return [];
};

// Keep the elastic agent versions list in Fleet UI updated
export const FetchAgentVersionsList: Task = {
  description: 'Build list of available Elastic Agent versions for Fleet UI',

  async run(config, log, build) {
    // Agent version list task is skipped for PR's, so as not to overwhelm the versions API
    if (isPr()) {
      return;
    }

    const versionsList = await getAvailableVersions(log);
    const AGENT_VERSION_BUILD_FILE = 'x-pack/plugins/fleet/target/agent_versions_list.json';

    if (versionsList !== []) {
      log.info(`Writing versions list to ${AGENT_VERSION_BUILD_FILE}`);
      await write(
        build.resolvePath(AGENT_VERSION_BUILD_FILE),
        JSON.stringify(versionsList, null, '  ')
      );
    }
  },
};
