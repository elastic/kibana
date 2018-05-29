import { resolve } from 'path';
import process from 'process';

import { LegacyKbnServer } from '../legacy_compat';

interface EnvOptions {
  config?: string;
  kbnServer?: any;
  [key: string]: any;
}

export class Env {
  /**
   * @internal
   */
  public static createDefault(options: EnvOptions): Env {
    return new Env(process.cwd(), options);
  }

  public readonly configDir: string;
  public readonly corePluginsDir: string;
  public readonly binDir: string;
  public readonly logDir: string;
  public readonly staticFilesDir: string;

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

  public getConfigFile() {
    const defaultConfigFile = this.getDefaultConfigFile();
    return this.options.config === undefined
      ? defaultConfigFile
      : this.options.config;
  }

  /**
   * @internal
   */
  public getLegacyKbnServer(): LegacyKbnServer | undefined {
    return this.options.kbnServer;
  }

  private getDefaultConfigFile() {
    return resolve(this.configDir, 'kibana.yml');
  }
}
