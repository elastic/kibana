/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SOContentStorage } from '@kbn/content-management-utils';
import type { NavigationEmbeddableCrudTypes } from '../../common/content_management';
import { CONTENT_ID } from '../../common';
import { cmServicesDefinition } from '../../common/content_management/cm_services';

export class NavigationEmbeddableStorage extends SOContentStorage<NavigationEmbeddableCrudTypes> {
  constructor() {
    super({
      savedObjectType: CONTENT_ID,
      cmServicesDefinition,
      enableMSearch: true,
      allowedSavedObjectAttributes: ['id', 'title', 'description', 'links'],
    });
  }
}
