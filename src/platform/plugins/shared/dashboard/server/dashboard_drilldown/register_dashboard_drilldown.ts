/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import {
  DASHBOARD_DRILLDOWN_SUPPORTED_TRIGGERS,
  DASHBOARD_DRILLDOWN_TYPE,
} from '../../common/page_bundle_constants';
import { transformIn, transformOut } from './transforms';
import { dashboardDrilldownSchema } from './schemas';
import type { DashboardDrilldownState, StoredDashboardDrilldownState } from './types';

export function registerDashboardDrilldown(embeddableSetup: EmbeddableSetup) {
  embeddableSetup.registerDrilldown<StoredDashboardDrilldownState, DashboardDrilldownState>(
    DASHBOARD_DRILLDOWN_TYPE,
    {
      schema: dashboardDrilldownSchema,
      supportedTriggers: DASHBOARD_DRILLDOWN_SUPPORTED_TRIGGERS,
      transformIn,
      transformOut,
    }
  );
}
