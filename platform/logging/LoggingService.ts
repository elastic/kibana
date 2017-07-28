import { Observable, Subject } from 'rxjs';

import { MutableLoggerFactory } from './LoggerFactory';
import { LoggingConfig } from './LoggingConfig';

/**
 * Service that is  responsible for maintaining the log config subscription and
 * pushing updates the the logger factory.
 */
export class LoggingService {
  private readonly stop$ = new Subject();

  constructor(private readonly loggingFactory: MutableLoggerFactory) {}

  /**
   * Takes `LoggingConfig` observable and pushes all config updates to the
   * internal logger factory.
   * @param config$ Observable that tracks all updates in the logging config.
   */
  upgrade(config$: Observable<LoggingConfig>) {
    config$.takeUntil(this.stop$).subscribe({
      next: config => this.loggingFactory.updateConfig(config)
    });
  }

  /**
   * Asynchronous method that causes service to unsubscribe from logging config updates
   * and close internal logger factory.
   */
  async stop() {
    this.stop$.next(true);
    this.stop$.complete();

    await this.loggingFactory.close();
  }
}
