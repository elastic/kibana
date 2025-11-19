/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SOContentStorage } from '@kbn/content-management-utils';
import type { Logger } from '@kbn/logging';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../common/constants';

// Minimal CM services definition for dashboard - only needed for search functionality
// Using a simple pass-through definition since we only need basic search
const cmServicesDefinition = {
  1: {
    search: {
      in: {
        options: {
          up: (x: any) => ({ value: x ?? {}, error: null }),
        },
      },
      out: {
        result: {
          validate: () => ({ value: true, error: null }),
          down: (x: any) => ({ value: x, error: null }),
        },
      },
    },
  },
};

export class DashboardStorage extends SOContentStorage<any> {
  constructor({
    logger,
    throwOnResultValidationError,
  }: {
    logger: Logger;
    throwOnResultValidationError: boolean;
  }) {
    super({
      savedObjectType: DASHBOARD_SAVED_OBJECT_TYPE,
      cmServicesDefinition,
      enableMSearch: true,
      allowedSavedObjectAttributes: [
        'title',
        'description',
        'version',
        'panelsJSON',
        'optionsJSON',
        'controlGroupInput',
        'kibanaSavedObjectMeta',
        'timeRestore',
        'timeFrom',
        'timeTo',
        'refreshInterval',
      ],
      logger,
      throwOnResultValidationError,
    });
  }
}

