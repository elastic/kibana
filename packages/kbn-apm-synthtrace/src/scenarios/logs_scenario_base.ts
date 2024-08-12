/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ScenarioBootstrap } from '../cli/scenario';
import { RunOptions } from '../cli/utils/parse_run_cli_flags';
import { IndexTemplateName } from '../lib/logs/custom_logsdb_index_templates';
import { parseLogsScenarioOpts } from './helpers/logs_scenario_opts_parser';

const logsScenarioBase: (runOptions: RunOptions) => { bootstrap: ScenarioBootstrap } = (
  runOptions
) => {
  return {
    bootstrap: async ({ logsEsClient }) => {
      const { isLogsDb } = parseLogsScenarioOpts(runOptions.scenarioOpts);
      if (isLogsDb) await logsEsClient.createIndexTemplate(IndexTemplateName.LogsDb);
    },
  };
};

export default logsScenarioBase;
