/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Command } from 'commander';
import { kibanaPackageJson, REPO_ROOT } from '@kbn/repo-info';
import { getPackages } from '@kbn/repo-packages';
import { startPod } from '@kbn/task-manager-plugin/server/task_pod';

/** A task pod family: the plugins whose `server/tasks` entries one pod process boots. */
interface TaskPodFamily {
  family: string;
  taskTypes: string[];
  plugins: string[];
}

/** Family name -> id of the plugin that owns its `task_pod.jsonc`. */
const FAMILY_OWNERS: Record<string, string> = {
  alerting_v2: 'alertingVTwo',
};

const loadFamily = (name: string): TaskPodFamily => {
  const owner = FAMILY_OWNERS[name];
  if (!owner) {
    throw new Error(
      `Unknown task pod family '${name}'. Known families: ${Object.keys(FAMILY_OWNERS).join(', ')}`
    );
  }
  const pkg = getPackages(REPO_ROOT).find(
    (p) => p.manifest.type === 'plugin' && p.manifest.plugin.id === owner
  );
  if (!pkg) throw new Error(`Plugin '${owner}' that owns the '${name}' family was not found`);
  const text = readFileSync(join(pkg.directory, 'task_pod.jsonc'), 'utf8');
  return JSON.parse(text.replace(/^\s*\/\/.*$/gm, '')) as TaskPodFamily;
};

const program = new Command('bin/kibana-task-pod');

program
  .version(kibanaPackageJson.version)
  .description(
    'Starts a task pod: a standby process that runs the tasks of one family on behalf of Kibana ' +
      '(env: ES_URL, ES_USERNAME/ES_PASSWORD or ES_API_KEY, PORT, POD_CONFIG, LOG_LEVEL)'
  )
  .requiredOption('--family <name>', 'The task pod family to run, e.g. alerting_v2')
  .option('--port <port>', 'Port to serve /run, /cancel and /health on', '3500')
  .action(async ({ family, port }: { family: string; port: string }) => {
    const { plugins } = loadFamily(family);
    process.env.PORT ??= port;
    await startPod({ pluginIds: plugins, defaultPort: Number(port) });
  });

program.parse(process.argv);
