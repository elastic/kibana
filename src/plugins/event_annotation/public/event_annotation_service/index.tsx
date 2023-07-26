/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from '@kbn/core/public';
import { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import { EventAnnotationServiceType } from '@kbn/event-annotation-components';
export type { EventAnnotationServiceType };

export class EventAnnotationService {
  private eventAnnotationService?: EventAnnotationServiceType;

  private core: CoreStart;
  private savedObjectsManagement: SavedObjectsManagementPluginStart;
  private contentManagement: ContentManagementPublicStart;

  constructor(
    core: CoreStart,
    contentManagement: ContentManagementPublicStart,
    savedObjectsManagement: SavedObjectsManagementPluginStart
  ) {
    this.core = core;
    this.contentManagement = contentManagement;
    this.savedObjectsManagement = savedObjectsManagement;
  }

  public async getService() {
    if (!this.eventAnnotationService) {
      const { getEventAnnotationService } = await import('./service');
      this.eventAnnotationService = getEventAnnotationService(
        this.core,
        this.contentManagement,
        this.savedObjectsManagement
      );
    }
    return this.eventAnnotationService;
  }
}
