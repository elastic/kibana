/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Command } from 'commander';
import { kibanaPackageJson } from '@kbn/repo-info';
import { startPod } from '@kbn/task-manager-plugin/server/task_pod';
import { loadFamily } from '@kbn/task-manager-plugin/server/task_pod/family';

const program = new Command('bin/kibana-task-pod');

program
  .version(kibanaPackageJson.version)
  .description(
    'Starts a task pod: a standby process that runs the tasks of one family on behalf of Kibana ' +
      '(env: ES_URL, ES_USERNAME/ES_PASSWORD or ES_API_KEY, PORT, POD_CONFIG, LOG_LEVEL; settings in\n' +
      'kibana.keystore are read too)'
  )
  .requiredOption('--family <name>', 'The task pod family to run, e.g. alerting_v2')
  .option('--port <port>', 'Port to serve /run, /cancel and /health on', '3500')
  .action(async ({ family, port }: { family: string; port: string }) => {
    const { plugins, taskTypes } = loadFamily(family);
    process.env.PORT ??= port;
    // Secrets such as preconfigured connectors' live in the keystore, which Kibana reads the same way.
    const { readKeystore } = await import('../keystore/lib/read_keystore');
    await startPod({
      pluginIds: plugins,
      taskTypes,
      defaultPort: Number(port),
      baseConfig: await readKeystore(),
    });
  });

program.parse(process.argv);
