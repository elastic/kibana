/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExecaChildProcess, ExecaReturnValue, StdioOption } from 'execa';
import execa from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';

import type { ToolingLog } from '@kbn/tooling-log';

interface ConfigRunnerOptions {
  index: string;
  log: ToolingLog;
  path: string;
  command: {
    exec: string;
    args: string[];
  };
  ports: {
    agentless: number;
    es: number[] | readonly number[];
    esTransport: number[] | readonly number[];
    packageRegistry: number;
    kibana: number;
    fleet: number;
  };
  stdio: 'suppress' | 'buffer' | 'inherit';
}

export class ConfigRunner {
  private proc?: ExecaChildProcess<string>;

  private all: string = '';

  constructor(private options: ConfigRunnerOptions) {}

  getConfigPath() {
    return this.options.path;
  }

  async start(): Promise<void> {
    const [filePath, ...tail] = this.options.command.args;

    const args = [filePath, '--pause', ...tail];

    const stdioRelatedOptions: {
      buffer: boolean;
      all: boolean;
      stdio: StdioOption[];
    } = {
      buffer: this.options.stdio !== 'inherit',
      all: this.options.stdio !== 'inherit',
      stdio: [
        'inherit',
        ...(this.options.stdio !== 'inherit' ? ['pipe', 'pipe'] : ['inherit', 'inherit']),
        'ipc',
      ] as StdioOption[],
    };

    this.proc = execa(this.options.command.exec, args, {
      env: {
        TEST_KIBANA_PORT: this.options.ports.kibana.toString(),
        TEST_ES_PORT: this.options.ports.es[0].toString(),
        TEST_ES_TRANSPORT_PORT: this.options.ports.esTransport[0].toString(),
        TEST_ES_02_PORT: this.options.ports.es[1].toString(),
        TEST_ES_02_TRANSPORT_PORT: this.options.ports.esTransport[1].toString(),
        TEST_ES_03_PORT: this.options.ports.es[2].toString(),
        TEST_ES_03_TRANSPORT_PORT: this.options.ports.esTransport[2].toString(),
        TEST_AGENTLESS_PORT: this.options.ports.agentless.toString(),
        TEST_FLEET_PORT: this.options.ports.fleet.toString(),
        FLEET_PACKAGE_REGISTRY_PORT: this.options.ports.packageRegistry.toString(),
        CI_PARALLEL_PROCESS_NUMBER: this.options.index,
        FORCE_COLOR: '1',
        npm_config_color: 'true',
      },
      extendEnv: true,
      cwd: REPO_ROOT,
      reject: false,
      ...stdioRelatedOptions,
    });

    const handleAll = (chunk: Buffer | string) => {
      this.all += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    };

    if (this.proc.all) {
      this.proc.all.on('data', handleAll);
    }

    let isResolved = false;

    await new Promise<void>((resolve) => {
      const complete = () => {
        isResolved = true;
        this.proc?.off('message', onMessage);
        resolve();
      };

      const onMessage = (msg: unknown) => {
        if (msg === 'FTR_WARMUP_DONE') {
          this.options.log.info('warmup done');
          complete();
        }
      };

      this.proc?.finally(() => {
        if (!isResolved) {
          this.options.log.info(`Process prematurely closed, exitCode ${this.proc!.exitCode}`);
        }
        complete();
      });
      this.proc?.on('message', onMessage);
    });
  }

  async run(): Promise<ExecaReturnValue<string>> {
    if (!this.proc) {
      throw new Error(`\`run\` was called before \`start\``);
    }

    this.proc.send('FTR_CONTINUE');

    this.proc.disconnect();

    return this.proc;
  }
}
