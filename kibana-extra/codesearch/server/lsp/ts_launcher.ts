/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { spawn } from 'child_process';
import getPort from 'get-port';
import * as Hapi from 'hapi';
import path from 'path';
import { Log } from '../log';
import { ILanguageServerLauncher } from './language_server_launcher';
import { LanguageServerProxy } from './proxy';
import { RequestExpander } from './request_expander';

export class TypescriptServerLauncher implements ILanguageServerLauncher {
  constructor(
    readonly targetHost: string,
    readonly detach: boolean,
    readonly server: Hapi.Server
  ) {}

  public async launch() {
    let port = 2090;

    if (!this.detach) {
      port = await getPort();
    }
    const log = new Log(this.server, ['LSP', `ts@${this.targetHost}:${port}`]);
    const proxy = new LanguageServerProxy(port, this.targetHost, log);

    if (this.detach) {
      log.info('Detach mode, expected LSP launch externally');
    } else {
      const spawnTs = () =>
        spawn(
          'node',
          [
            '--max_old_space_size=4096',
            path.resolve(
              __dirname,
              '../../../../lsp/javascript-typescript-langserver/lib/language-server'
            ),
            '-p',
            port.toString(),
            '-c',
            '1',
          ],
          {
            detached: false,
            stdio: 'inherit',
          }
        );
      let child = spawnTs();
      log.info(`Launch Typescript Language Server at port ${port}, pid:${child.pid}`);
      proxy.onDisconnected(() => {
        child.kill();
        child = spawnTs();
      });
    }
    proxy.onDisconnected(() => {
      if (!proxy.isClosed) {
        log.warn('language server disconnected, reconnecting');
        setTimeout(() => proxy.connect(), 1000);
      }
    });
    proxy.listen();
    return new RequestExpander(proxy);
  }
}
