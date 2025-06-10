/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { RunWithCommands } from '@kbn/dev-cli-runner';
import { cli as reportingCLI } from '@kbn/scout-reporting';
import { startServerCmd } from './start_server';
import { runTestsCmd } from './run_tests';
import { discoverPlaywrightConfigsCmd } from './config_discovery';

export async function run() {
  await new RunWithCommands(
    {
      description: 'Scout CLI',
    },
    [
      startServerCmd,
      runTestsCmd,
      discoverPlaywrightConfigsCmd,
      reportingCLI.initializeReportDatastream,
      reportingCLI.uploadEvents,
    ]
  ).execute();
}
