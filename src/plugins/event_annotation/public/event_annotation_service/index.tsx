/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from '@kbn/core/public';
// import { EventAnnotationGroupConfig } from '../../common';
import { EventAnnotationServiceType } from './types';

export class EventAnnotationService {
  private eventAnnotationService?: EventAnnotationServiceType;
  public async getService(core: CoreStart) {
    if (!this.eventAnnotationService) {
      const { getEventAnnotationService } = await import('./service');
      this.eventAnnotationService = getEventAnnotationService(core);
    }
    return this.eventAnnotationService;
  }
}
