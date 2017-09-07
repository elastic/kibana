import * as process from 'process';
import { resolve } from 'path';

import { Proxy } from '../server/http/Proxy/Proxy';

interface WithConfig {
  config?: string;
  kbnServer?: any;
  [key: string]: any;
}

export class Env {
  readonly configDir: string;
  readonly pluginsDir: string;
  readonly binDir: string;
  readonly logDir: string;
  readonly staticFilesDir: string;

  /**
   * @internal
   */
  static createDefault(argv: WithConfig): Env {
    return new Env(process.cwd(), argv);
  }

  /**
   * @internal
   */
  constructor(readonly homeDir: string, private readonly argv: WithConfig) {
    this.configDir = resolve(this.homeDir, 'config');
    this.pluginsDir = resolve(this.homeDir, 'core_plugins');
    this.binDir = resolve(this.homeDir, 'bin');
    this.logDir = resolve(this.homeDir, 'log');
    this.staticFilesDir = resolve(this.homeDir, 'ui');
  }

  getConfigFile() {
    const defaultConfigFile = this.getDefaultConfigFile();
    return this.argv.config === undefined
      ? defaultConfigFile
      : this.argv.config;
  }

  getPluginDir(pluginName: string) {
    return resolve(this.pluginsDir, pluginName, 'target', 'dist');
  }

  getProxy(): Proxy | undefined {
    return this.argv.kbnServer && this.argv.kbnServer.proxy;
  }

  private getDefaultConfigFile() {
    return resolve(this.configDir, 'kibana.yml');
  }
}
