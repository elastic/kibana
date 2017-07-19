import * as process from 'process';
import { resolve } from 'path';

interface WithConfig {
  config?: string;
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
    // TODO Fix path, should not be `ts-tmp`, that was only to get stuff running
    const platformDir = resolve(this.homeDir, 'ts-tmp');

    this.configDir = resolve(this.homeDir, 'config');
    this.pluginsDir = resolve(platformDir, 'plugins');
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

  private getDefaultConfigFile() {
    return resolve(this.configDir, 'kibana.yml');
  }
}
