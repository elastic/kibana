/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import process from 'process';
import yargs from 'yargs/yargs';
import { analyzePlugin } from './analyze_plugin';

export function runPluginAnalyzerCli(argv: string[] = process.argv) {
  argumentParser.parse(argv.slice(2));
}

const argumentParser = yargs().command(
  '$0 <pluginTsconfigPath>',
  'analyze a Kibana plugin',
  (command) =>
    command
      .positional('pluginTsconfigPath', {
        describe: "path to the plugin's tsconfig file",
        type: 'string',
        normalize: true,
      })
      .require(['pluginTsconfigPath']),
  async (args) => {
    await analyzePlugin(args.pluginTsconfigPath);
  }
);
