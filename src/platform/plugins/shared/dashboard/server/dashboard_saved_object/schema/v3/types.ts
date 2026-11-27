/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import type { SavedDashboardPanel as SavedDashboardPanelV2 } from '../v2';
import type { dashboardAttributesSchema, gridDataSchema, sectionSchema } from './v3';

/** The attributes of a dashboard saved object. */
export type DashboardAttributes = TypeOf<typeof dashboardAttributesSchema> & {
  projectRouting?: string;
  esqlApproximation?: boolean;
  /**
   * Sequence of the latest change history version. It is bumped with every versioned write, under the
   * saved object's optimistic concurrency control, so concurrent saves can never share a sequence.
   * Absent on dashboards that have not been saved since it was introduced.
   */
  historySequence?: number;
} & {
  /**
   * To avoid defining a new SO version, I am adding the new key `pinned_panels` here
   * rather than as part of the dashboard attributes schema
   */
  pinned_panels?: {
    panels: {
      [uuid: string]: {
        type: string;
        order: number;
        width?: string;
        grow?: boolean;
        config: object;
      };
    };
  };
};

export type GridData = TypeOf<typeof gridDataSchema>;

/**
 * A saved dashboard panel parsed directly from the Dashboard Attributes panels JSON
 */
export type SavedDashboardPanel = Omit<SavedDashboardPanelV2, 'gridData'> & { gridData: GridData };

/**
 * A saved dashboard section parsed directly from the Dashboard Attributes
 */
export type SavedDashboardSection = TypeOf<typeof sectionSchema>;
