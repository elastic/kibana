/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SOContentStorage } from '@kbn/content-management-utils';
import type { Logger } from '@kbn/logging';

import type { DataViewCrudTypes } from '../../common/content_management';
import { DataViewSOType } from '../../common/content_management';
import { cmServicesDefinition } from './schema/cm_services';

export class DataViewsStorage extends SOContentStorage<DataViewCrudTypes> {
  constructor({
    logger,
    throwOnResultValidationError,
  }: {
    logger: Logger;
    throwOnResultValidationError: boolean;
  }) {
    super({
      savedObjectType: DataViewSOType,
      cmServicesDefinition,
      enableMSearch: true,
      allowedSavedObjectAttributes: [
        'fields',
        'title',
        'type',
        'typeMeta',
        'timeFieldName',
        'sourceFilters',
        'fieldFormatMap',
        'fieldAttrs',
        'runtimeFieldMap',
        'allowNoIndex',
        'name',
        'allowHidden',
      ],
      mSearchAdditionalSearchFields: ['name'],
      logger,
      throwOnResultValidationError,
    });
  }
}
