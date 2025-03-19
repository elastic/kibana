/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SOContentStorage } from '@kbn/content-management-utils';

import { Logger } from '@kbn/logging';
import { cmServicesDefinition } from './cm_services';
import type {
  VisualizationContentType,
  VisualizationCrudTypes,
} from '../../common/content_management';

const SO_TYPE: VisualizationContentType = 'visualization';

export class VisualizationsStorage extends SOContentStorage<VisualizationCrudTypes> {
  constructor({
    logger,
    throwOnResultValidationError,
  }: {
    logger: Logger;
    throwOnResultValidationError: boolean;
  }) {
    super({
      savedObjectType: SO_TYPE,
      cmServicesDefinition,
      enableMSearch: true,
      allowedSavedObjectAttributes: [
        'title',
        'description',
        'version',
        'visState',
        'kibanaSavedObjectMeta',
        'uiStateJSON',
        'savedSearchRefName',
      ],
      logger,
      throwOnResultValidationError,
    });
  }
}
