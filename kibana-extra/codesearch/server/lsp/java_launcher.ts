/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { spawn } from 'child_process';
import getPort from 'get-port';
import * as glob from 'glob';
import * as Hapi from 'hapi';
import { platform as getOsPlatform } from 'os';
import path from 'path';
import { Log } from '../log';
import { ILanguageServerLauncher } from './language_server_launcher';
import { LanguageServerProxy } from './proxy';
import { RequestExpander } from './request_expander';

export class JavaLauncher implements ILanguageServerLauncher {
  constructor(
    readonly targetHost: string,
    readonly detach: boolean,
    readonly server: Hapi.Server
  ) {}

  public async launch(builtinWorkspace: boolean, maxWorkspace: number) {
    let port = 2090;

    if (!this.detach) {
      port = await getPort();
    }
    const log = new Log(this.server, ['LSP', `java@${this.targetHost}:${port}`]);
    const proxy = new LanguageServerProxy(port, this.targetHost, log);
    proxy.awaitServerConnection();
    const javaLangserverPath = path.resolve(
      __dirname,
      '../../../../lsp/eclipse.jdt.ls/org.elastic.jdt.ls.product/target/repository'
    );
    const launchersFound = glob.sync('**/plugins/org.eclipse.equinox.launcher_*.jar', {
      cwd: javaLangserverPath,
    });
    if (!launchersFound.length) {
      log.error('cannot find executable jar for JavaLsp');
    }

    let config = './config_mac/';
    // detect platform
    switch (getOsPlatform()) {
      case 'darwin':
        break;
      case 'win32':
        config = './config_win/';
      case 'linux':
        config = './config_linux/';
      default:
        log.error('Unable to find platform for this os');
    }

    if (!this.detach) {
      process.env.CLIENT_PORT = port.toString();
      const spawnJava = () => {
        return spawn(
          'java',
          [
            '-Declipse.application=org.elastic.jdt.ls.core.id1',
            '-Dosgi.bundles.defaultStartLevel=4',
            '-Declipse.product=org.elastic.jdt.ls.core.product',
            '-Dlog.level=ALL',
            '-noverify',
            '-Xmx4G',
            '-jar',
            path.resolve(javaLangserverPath, launchersFound[0]),
            '-configuration',
            path.resolve(javaLangserverPath, config),
            '-data',
            '/tmp/data',
          ],
          {
            detached: false,
            stdio: 'inherit',
            env: process.env,
          }
        );
      };
      let child = spawnJava();
      log.info(`Launch Java Language Server at port ${process.env.CLIENT_PORT}, pid:${child.pid}, JAVA_HOME:${process.env.JAVA_HOME}`);
      proxy.onDisconnected(() => {
        if (!proxy.isClosed) {
          child.kill();
          proxy.awaitServerConnection();
          log.warn('language server disconnected, restarting it');
          child = spawnJava();
        }
      });
    } else {
      proxy.onDisconnected(() => {
        if (!proxy.isClosed) {
          proxy.awaitServerConnection();
        }
      });
    }
    proxy.listen();
    return new RequestExpander(proxy, builtinWorkspace, maxWorkspace);
  }
}
