import { Observable, Subject } from 'rxjs';

import { MutableLoggerFactory } from './LoggerFactory';
import { LoggingConfig } from './LoggingConfig';

// The `LoggerManager` is responsible for maintaining the log config
// subscription and pushing updates the the mutable logger.

export class LoggerService {
  private readonly stop$ = new Subject();

  constructor(private readonly loggingFactory: MutableLoggerFactory) {}

  upgrade(config$: Observable<LoggingConfig>) {
    config$.takeUntil(this.stop$).subscribe({
      next: config => this.loggingFactory.updateConfig(config)
    });
  }

  async stop() {
    this.stop$.next(true);
    this.stop$.complete();

    await this.loggingFactory.close();
  }
}
