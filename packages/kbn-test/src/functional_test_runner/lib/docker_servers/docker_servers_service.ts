/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Url from 'url';
import execa from 'execa';
import { filter, take } from 'rxjs/operators';
import { ToolingLog } from '@kbn/dev-utils';

import { Lifecycle } from '../lifecycle';
import { observeContainerRunning } from './container_running';
import { observeContainerLogs } from './container_logs';
import { DockerServer, DockerServiceConfig } from './define_docker_servers_config';

export class DockerServersService {
  private servers: DockerServer[];

  constructor(
    configs: {
      [name: string]: DockerServiceConfig;
    },
    private log: ToolingLog,
    private lifecycle: Lifecycle
  ) {
    this.servers = Object.entries(configs).map(([name, config]) => {
      return {
        ...config,
        name,
        url: Url.format({
          protocol: 'http:',
          hostname: 'localhost',
          port: config.port,
        }),
      };
    });

    this.lifecycle.beforeTests.add(async () => {
      await this.startServers();
    });
  }

  has(name: string) {
    return this.servers.some(s => s.name === name);
  }

  get(name: string) {
    const server = this.servers.find(s => s.name === name);
    if (!server) {
      throw new Error(`no server with name "${name}"`);
    }
    return { ...server };
  }

  private async startServer(server: DockerServer) {
    const { log, lifecycle } = this;
    const { image, name, port, portInContainer, waitFor, waitForLogLine } = server;

    // pull image from registry
    log.info(`[docker:${name}] pulling docker image "${image}"`);
    await execa('docker', ['pull', image]);

    // run the image that we just pulled
    log.info(`[docker:${name}] running image "${image}"`);
    const containerId = (
      await execa('docker', ['run', '-dit', '-p', `${port}:${portInContainer}`, image])
    ).stdout.trim();
    lifecycle.cleanup.add(() => {
      try {
        execa.sync('docker', ['kill', containerId]);
      } catch (error) {
        if (error.message.includes(`Container ${containerId} is not running`)) {
          return;
        }

        throw error;
      }
    });

    // push the logs from the container to our logger, and expose an observable of those lines for testing
    const logLine$ = observeContainerLogs(name, containerId, log);
    lifecycle.cleanup.add(async () => {
      await logLine$.toPromise();
    });

    // ensure container stays running, error if it exits
    lifecycle.cleanup.addSub(
      observeContainerRunning(name, containerId, log).subscribe({
        error: error => {
          lifecycle.cleanup.after$.subscribe(() => {
            log.error(`[docker:${name}] Error ensuring that the container is running`);
            log.error(error);
            process.exit(1);
          });

          lifecycle.cleanup.trigger();
        },
      })
    );

    // wait for conditions before completing
    if (waitForLogLine instanceof RegExp) {
      log.info(`[docker:${name}] Waiting for log line matching /${waitForLogLine.source}/`);
    }
    if (typeof waitForLogLine === 'string') {
      log.info(`[docker:${name}] Waiting for log line containing "${waitForLogLine}"`);
    }
    if (waitFor !== undefined) {
      log.info(`[docker:${name}] Waiting for waitFor() promise to resolve`);
    }
    if (waitForLogLine === undefined && waitFor === undefined) {
      log.warning(
        `[docker:${name}] No "waitFor*" condition defined, you should always ` +
          `define a wait condition to avoid race conditions that are more likely ` +
          `to fail on CI because we're not waiting for the contained server to be ready.`
      );
    }

    await Promise.all<unknown>([
      waitFor !== undefined && waitFor(server, logLine$.asObservable()),
      waitForLogLine !== undefined &&
        logLine$
          .pipe(
            filter(line =>
              waitForLogLine instanceof RegExp
                ? waitForLogLine.test(line)
                : line.includes(waitForLogLine)
            ),
            take(1)
          )
          .toPromise(),
    ]);
  }

  private async startServers() {
    await Promise.all(this.servers.map(async server => this.startServer(server)));
  }
}
