import { writeFileSync, unlinkSync } from 'fs';
import { Observable, Subscription } from 'rxjs';

import { PidConfig } from './PidConfig';
import { LoggerFactory, Logger } from '../../logger';
import { KibanaError } from '../../lib/Errors';

const FILE_ALREADY_EXISTS = 'EEXIST';

const noop = () => {};

class PidFile {
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

export class PidService {
  private readonly pid$: Observable<PidFile | void>;
  private subscription?: Subscription;

  constructor(pidConfig$: Observable<PidConfig | void>, logger: LoggerFactory) {
    this.pid$ = pidConfig$
      .map(config => config !== undefined
        ? new PidFile(process.pid, config, logger)
        : undefined
      )
      .switchMap(pid => {
        // We specifically handle `undefined` to make sure the previous pid
        // will be deleted.
        if (pid === undefined) {
          return new Observable<PidFile | void>(noop);
        }

        return new Observable<PidFile | void>(observable => {
          pid.writeFile();
          observable.next(pid);

          return () => {
            pid.deleteFile();
          }
        })
      })
  }

  start() {
    this.subscription = this.pid$.subscribe();
  }

  stop() {
    if (this.subscription !== undefined) {
      this.subscription.unsubscribe();
    }
  }
}