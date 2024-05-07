/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createLogger } from '../../lib/utils/create_logger';
import { getApmEsClient } from './get_apm_es_client';
import { getLogsEsClient } from './get_logs_es_client';
import { getInfraEsClient } from './get_infra_es_client';
import { getKibanaClient } from './get_kibana_client';
import { getServiceUrls } from './get_service_urls';
import { RunOptions } from './parse_run_cli_flags';
import { getAssetsEsClient } from './get_assets_es_client';

export async function bootstrap(runOptions: RunOptions) {
  const logger = createLogger(runOptions.logLevel);

  let version = runOptions['assume-package-version'];

  const { kibanaUrl, esUrl } = await getServiceUrls({ ...runOptions, logger });

  const kibanaClient = getKibanaClient({
    target: kibanaUrl,
    logger,
  });

  if (!version) {
    version = await kibanaClient.fetchLatestApmPackageVersion();
    await kibanaClient.installApmPackage(version);
  } else if (version === 'latest') {
    version = await kibanaClient.fetchLatestApmPackageVersion();
  }

  logger.info(`Using package version: ${version}`);

  const apmEsClient = getApmEsClient({
    target: esUrl,
    logger,
    concurrency: runOptions.concurrency,
    version,
  });

  const logsEsClient = getLogsEsClient({
    target: esUrl,
    logger,
    concurrency: runOptions.concurrency,
  });

  const infraEsClient = getInfraEsClient({
    target: esUrl,
    logger,
    concurrency: runOptions.concurrency,
  });

  const assetsEsClient = getAssetsEsClient({
    target: esUrl,
    logger,
    concurrency: runOptions.concurrency,
  });

  if (runOptions.clean) {
    await apmEsClient.clean();
    await logsEsClient.clean();
    await infraEsClient.clean();
    await assetsEsClient.clean();
  }

  return {
    logger,
    apmEsClient,
    logsEsClient,
    infraEsClient,
    assetsEsClient,
    version,
    kibanaUrl,
    esUrl,
  };
}
