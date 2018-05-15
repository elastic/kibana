import { Observable, Subscription } from '../../lib/kbn_observable';

import { MutableLoggerFactory } from './logger_factory';
import { LoggingConfig } from './logging_config';

/**
 * Service that is responsible for maintaining the log config subscription and
 * pushing updates the the logger factory.
 */
export class LoggingService {
  private subscription?: Subscription;

  constructor(private readonly loggingFactory: MutableLoggerFactory) {}

  /**
   * Takes `LoggingConfig` observable and pushes all config updates to the
   * internal logger factory.
   * @param config$ Observable that tracks all updates in the logging config.
   */
  upgrade(config$: Observable<LoggingConfig>) {
    this.subscription = config$.subscribe({
      next: config => this.loggingFactory.updateConfig(config),
    });
  }

  /**
   * Asynchronous method that causes service to unsubscribe from logging config updates
   * and close internal logger factory.
   */
  async stop() {
    if (this.subscription !== undefined) {
      this.subscription.unsubscribe();
    }
    await this.loggingFactory.close();
  }
}
