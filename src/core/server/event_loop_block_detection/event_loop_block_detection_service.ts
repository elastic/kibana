/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { initWhoBlocked } from '@kbn/who-blocked';
import { take } from 'rxjs/operators';
import { config } from './config';

export class EventLoopBlockDetectionService {
  constructor(private readonly coreContext: CoreContext) {
    this.logger = coreContext.logger.get('event-loop-block-detection');
    this.config$ = coreContext.configService.atPath<EventLoopBlockDetectionConfigType>(config.path);
  }

  public async preboot() {
    const eventLoopBlockDetectionConfig = await this.config$.pipe(take(1)).toPromise();
    if (eventLoopBlockDetectionConfig.enabled) {
      initWhoBlocked(eventLoopBlockDetectionConfig.threshold.milliseconds());
    }
  }
}
