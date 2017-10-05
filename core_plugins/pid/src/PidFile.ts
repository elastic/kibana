import { writeFileSync, unlinkSync } from 'fs';

import { PidConfig } from './PidConfig';
import { LoggerFactory, Logger, KibanaError } from 'kbn-types';

const FILE_ALREADY_EXISTS = 'EEXIST';

export class PidFile {
  log: Logger;

  constructor(
    private readonly pid: number,
    private readonly pidConfig: PidConfig,
    logger: LoggerFactory
  ) {
    this.log = logger.get('pidfile');
  }

  writeFile() {
    const pid = String(this.pid);
    const path = this.pidConfig.file;

    try {
      writeFileSync(path, pid, { flag: 'wx' });
    } catch (err) {
      if (err.code !== FILE_ALREADY_EXISTS) {
        throw err;
      }

      const message = `pid file already exists at [${path}]`;

      if (this.pidConfig.failIfPidFileAlreadyExists) {
        throw new KibanaError(message, err);
      }

      this.log.warn(message, { path, pid });

      writeFileSync(path, pid);
    }

    this.log.debug(`wrote pid file [${path}]`);
  }

  deleteFile() {
    const path = this.pidConfig.file;
    this.log.debug(`deleting pid file [${path}]`);
    unlinkSync(path);
  }
}
