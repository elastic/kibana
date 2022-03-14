/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EventAnnotationServiceType } from './types';

export class EventAnnotationService {
  private annotationService: EventAnnotationServiceType | undefined = undefined;
  public async getService() {
    if (!this.annotationService) {
      const { getAnnotationService } = await import('./service');
      this.annotationService = getAnnotationService();
    }
    return this.annotationService;
  }
}
