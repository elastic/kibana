/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run } from '@kbn/dev-cli-runner';

import Fs from 'fs';
import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';
import { ProcRunner } from '@kbn/dev-proc-runner';

const winVersion = (path: string) => (process.platform === 'win32' ? `${path}.cmd` : path);

// There's likely a FAAAAAR better way to do this, but this works for now.
async function runKibana({ log, projectName }: { log: ToolingLog; projectName: string }) {
  const pluginDir = Path.resolve(REPO_ROOT, 'src/plugins/serverless/config');
  const yml = Path.resolve(pluginDir, `${projectName}.yml`);

  if (!Fs.existsSync(yml)) {
    return;
  }

  const proc = new ProcRunner(log);
  proc.run('kibana', {
    cmd: process.argv0,
    args: ['scripts/kibana', '--dev', '--config', yml],
    cwd: REPO_ROOT,
    wait: true,
  });
}

run(
  async ({ log, flagsReader }) => {
    log.info(flagsReader.getPositionals());
    // Haaaaack.
    runKibana({ log, projectName: flagsReader.getPositionals()[0] });
  },
  {
    usage: `node scripts/run_project [project]`,
    description: 'Run a serverless project configuration',
  }
);
