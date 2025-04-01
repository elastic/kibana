/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreStart } from '@kbn/core/public';
import { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import { EventAnnotationServiceType } from '@kbn/event-annotation-components';
export type { EventAnnotationServiceType };

export class EventAnnotationService {
  private eventAnnotationService?: EventAnnotationServiceType;

  private core: CoreStart;
  private contentManagement: ContentManagementPublicStart;

  constructor(core: CoreStart, contentManagement: ContentManagementPublicStart) {
    this.core = core;
    this.contentManagement = contentManagement;
  }

  public async getService() {
    if (!this.eventAnnotationService) {
      const { getEventAnnotationService } = await import('./service');
      this.eventAnnotationService = getEventAnnotationService(this.core, this.contentManagement);
    }
    return this.eventAnnotationService;
  }
}
