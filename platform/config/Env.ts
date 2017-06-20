import * as process from 'process';
import { resolve } from 'path';

export class Env {

  readonly configDir: string;
  readonly pluginsDir: string;
  readonly binDir: string;
  readonly logDir: string;
  readonly staticFilesDir: string;

  static createDefault(): Env {
    return new Env(process.cwd());
  }

  constructor(readonly homeDir: string) {
    // TODO Fix path, should not be `ts-tmp`, that was only to get stuff running
    const platformDir = resolve(this.homeDir, 'ts-tmp');

    this.configDir = resolve(this.homeDir, 'config');
    this.pluginsDir = resolve(platformDir, 'plugins');
    this.binDir = resolve(this.homeDir, 'bin');
    this.logDir = resolve(this.homeDir, 'log');
    this.staticFilesDir = resolve(this.homeDir, 'ui');
  }

  getDefaultConfigFile() {
    return resolve(this.configDir, 'kibana.yml');
  }
}
