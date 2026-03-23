/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { EventAnnotationServiceType } from '@kbn/event-annotation-components';
export type { EventAnnotationServiceType };

export class EventAnnotationService {
  private servicePromise?: Promise<EventAnnotationServiceType>;

  private core: CoreStart;
  private contentManagement: ContentManagementPublicStart;

  constructor(core: CoreStart, contentManagement: ContentManagementPublicStart) {
    this.core = core;
    this.contentManagement = contentManagement;
  }

  public getService(): Promise<EventAnnotationServiceType> {
    if (!this.servicePromise) {
      this.servicePromise = import('./service').then(({ getEventAnnotationService }) =>
        getEventAnnotationService(this.core, this.contentManagement)
      );
    }
    return this.servicePromise;
  }
}
