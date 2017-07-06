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
      // Each time a new observable is produced, we’ll throw out the previous
      // one and never see its values again. It allows us to map and flatten
      // like `flatMap`, but it "switches" to each new observable and forgets
      // whatever came before it.
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
