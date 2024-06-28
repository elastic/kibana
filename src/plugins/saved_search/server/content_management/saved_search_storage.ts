/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SOContentStorage } from '@kbn/content-management-utils';
import type { Logger } from '@kbn/logging';

import type { SavedSearchCrudTypes } from '../../common/content_management';
import { SavedSearchType } from '../../common/content_management';
import { cmServicesDefinition } from '../../common/content_management/cm_services';

export class SavedSearchStorage extends SOContentStorage<SavedSearchCrudTypes> {
  constructor({
    logger,
    throwOnResultValidationError,
  }: {
    logger: Logger;
    throwOnResultValidationError: boolean;
  }) {
    super({
      savedObjectType: SavedSearchType,
      cmServicesDefinition,
      enableMSearch: true,
      allowedSavedObjectAttributes: [
        'title',
        'sort',
        'columns',
        'description',
        'grid',
        'hideChart',
        'isTextBasedQuery',
        'usesAdHocDataView',
        'kibanaSavedObjectMeta',
        'viewMode',
        'hideAggregatedPreview',
        'rowHeight',
        'headerRowHeight',
        'timeRestore',
        'timeRange',
        'refreshInterval',
        'rowsPerPage',
        'breakdownField',
        'sampleSize',
        'visContext',
      ],
      logger,
      throwOnResultValidationError,
    });
  }
}
