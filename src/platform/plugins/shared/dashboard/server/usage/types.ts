/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectAccessControl, SavedObjectReference } from '@kbn/core/server';
import type { DashboardSavedObjectAttributes } from '../dashboard_saved_object';

export interface DashboardHit {
  attributes: DashboardSavedObjectAttributes;
  references: SavedObjectReference[];
  accessControl?: SavedObjectAccessControl;
}

// TODO: Merge with LatestTaskStateSchema. Requires a refactor of collectPanelsByType() because
// LatestTaskStateSchema doesn't allow mutations (uses ReadOnly<..>).
export interface DashboardCollectorData {
  panels: {
    total: number;
    by_reference: number;
    by_value: number;
    by_type: {
      [key: string]: {
        total: number;
        by_reference: number;
        by_value: number;
        details: {
          [key: string]: number;
        };
      };
    };
  };
  controls: {
    total: number;
    by_type: {
      [key: string]: {
        total: number;
      };
    };
  };
  sections: {
    total: number;
  };
  access_mode: {
    [key: string]: {
      total: number;
    };
  };
}
