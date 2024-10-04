/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LogDocument, log } from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';
import { IndexTemplateName } from '../lib/logs/custom_logsdb_index_templates';
import { withClient } from '../lib/utils/with_client';
import { parseLogsScenarioOpts } from './helpers/logs_scenario_opts_parser';
import { getJavaLog, getWebLog } from './helpers/logs_mock_data';

const scenario: Scenario<LogDocument> = async (runOptions) => {
  const { isLogsDb } = parseLogsScenarioOpts(runOptions.scenarioOpts);
  return {
    bootstrap: async ({ logsEsClient }) => {
      if (isLogsDb) await logsEsClient.createIndexTemplate(IndexTemplateName.LogsDb);
    },
    generate: ({ range, clients: { logsEsClient } }) => {
      const { logger } = runOptions;

      const datasetJavaLogs = (timestamp: number) =>
        log.create({ isLogsDb }).dataset('java').message(getJavaLog()).timestamp(timestamp);

      const datasetWebLogs = (timestamp: number) =>
        log.create({ isLogsDb }).dataset('web').message(getWebLog()).timestamp(timestamp);

      const logs = range
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return Array(200)
            .fill(0)
            .flatMap((_, index) => [datasetJavaLogs(timestamp), datasetWebLogs(timestamp)]);
        });

      return withClient(
        logsEsClient,
        logger.perf('generating_logs', () => logs)
      );
    },
  };
};

export default scenario;
