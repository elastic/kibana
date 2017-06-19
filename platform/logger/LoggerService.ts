import { Observable, Subject } from 'rxjs';

import { MutableLogger } from './LoggerFactory';
import { LoggerConfig } from './LoggerConfig';

// The `LoggerManager` is responsible for maintaining the log config
// subscription and pushing updates the the mutable logger.

export class LoggerService {
  private readonly stop$ = new Subject();

  constructor(private readonly mutableLogger: MutableLogger) {
  }

  upgrade(config$: Observable<LoggerConfig>) {
    config$
      .takeUntil(this.stop$)
      .subscribe({
        next: config => {
          this.mutableLogger.updateLogger(config);
        },
        complete: () => {
          this.mutableLogger.close();
        }
      });
  }

  stop() {
    this.stop$.next(true);
    this.stop$.complete();
  }
}