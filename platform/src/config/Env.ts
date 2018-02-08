import * as process from 'process';
import { resolve } from 'path';

import { LegacyKbnServer } from '../legacy';

interface EnvOptions {
  config?: string;
  kbnServer?: any;
  [key: string]: any;
}

export class Env {
  readonly configDir: string;
  readonly corePluginsDir: string;
  readonly binDir: string;
  readonly logDir: string;
  readonly staticFilesDir: string;

  /**
   * @internal
   */
  static createDefault(options: EnvOptions): Env {
    return new Env(process.cwd(), options);
  }

  /**
   * @internal
   */
  constructor(readonly homeDir: string, private readonly options: EnvOptions) {
    this.configDir = resolve(this.homeDir, 'config');
    this.corePluginsDir = resolve(this.homeDir, 'core_plugins');
    this.binDir = resolve(this.homeDir, 'bin');
    this.logDir = resolve(this.homeDir, 'log');
    this.staticFilesDir = resolve(this.homeDir, 'ui');
  }

  getConfigFile() {
    const defaultConfigFile = this.getDefaultConfigFile();
    return this.options.config === undefined
      ? defaultConfigFile
      : this.options.config;
  }

  /**
   * @internal
   */
  getLegacyKbnServer(): LegacyKbnServer | undefined {
    return this.options.kbnServer;
  }

  private getDefaultConfigFile() {
    return resolve(this.configDir, 'kibana.yml');
  }
}
