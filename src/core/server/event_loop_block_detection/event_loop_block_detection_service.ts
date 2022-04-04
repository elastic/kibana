/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { take } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { EventLoopBlockDetectionAsyncHook } from './async_hook';
import { config, EventLoopBlockDetectionConfigType } from './config';
import { CoreContext } from '../core_context';
import { Logger } from '../logging';

export class EventLoopBlockDetectionService {
  #asyncHook?: EventLoopBlockDetectionAsyncHook;
  readonly #config$: Observable<EventLoopBlockDetectionConfigType>;
  readonly #logger: Logger;

  constructor(coreContext: CoreContext) {
    this.#config$ = coreContext.configService.atPath<EventLoopBlockDetectionConfigType>(
      config.path
    );
    this.#logger = coreContext.logger.get('event-loop-block-detection');
  }

  public async preboot() {
    const eventLoopBlockDetectionConfig = await this.#config$.pipe(take(1)).toPromise();
    if (eventLoopBlockDetectionConfig.enabled) {
      this.#asyncHook = new EventLoopBlockDetectionAsyncHook(
        eventLoopBlockDetectionConfig.threshold.milliseconds(),
        this.#logger
      );
      this.#asyncHook.enable();
    }
  }
}
