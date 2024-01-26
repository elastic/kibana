/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { SOContentStorage } from '@kbn/content-management-utils';

import { EVENT_ANNOTATION_GROUP_TYPE } from '@kbn/event-annotation-common';
import { Logger } from '@kbn/logging';
import { cmServicesDefinition } from '../../common/content_management/cm_services';
import type { EventAnnotationGroupCrudTypes } from '../../common/content_management';

export class EventAnnotationGroupStorage extends SOContentStorage<EventAnnotationGroupCrudTypes> {
  constructor({
    logger,
    throwOnResultValidationError,
  }: {
    logger: Logger;
    throwOnResultValidationError: boolean;
  }) {
    super({
      savedObjectType: EVENT_ANNOTATION_GROUP_TYPE,
      cmServicesDefinition,
      enableMSearch: true,
      allowedSavedObjectAttributes: [
        'title',
        'description',
        'annotations',
        'ignoreGlobalFilters',
        'dataViewSpec',
      ],
      logger,
      throwOnResultValidationError,
    });
  }
}
