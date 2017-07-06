import { Observable, Subscription } from 'rxjs';
import { noop } from 'lodash';

import { PidConfig } from './PidConfig';
import { PidFile } from './PidFile';
import { LoggerFactory } from '../../logger';

export class PidService {
  private readonly pid$: Observable<PidFile | void>;
  private subscription?: Subscription;

  constructor(pidConfig$: Observable<PidConfig | void>, logger: LoggerFactory) {
    this.pid$ = pidConfig$
      .map(
        config =>
          config !== undefined
            ? new PidFile(process.pid, config, logger)
            : undefined
      )
      // Explanation of `switchMap`:
      // It's kinda like a normal `flatMap`, except it's producing observables
      // and you _only_ care about the latest observable it produced. It's
      // usually used if you need to control what happens both when you create
      // and when you're done with an observable, like here where we want to
      // write the pid file we receive a pid config, and delete it when we
      // receive new config values (or when we stop the pid service).
      .switchMap(pid => {
        if (pid === undefined) {
          // If pid is not specified, we return an observable that does nothing
          return new Observable<PidFile | void>(noop);
        }

        // Otherwise we return an observable that writes the pid when
        // subscribed to and deletes it when unsubscribed (e.g. if new config
        // is received or if `stop` is called below.)

        return new Observable<PidFile | void>(observable => {
          pid.writeFile();

          return function unsubscribe() {
            pid.deleteFile();
          };
        });
      });
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
