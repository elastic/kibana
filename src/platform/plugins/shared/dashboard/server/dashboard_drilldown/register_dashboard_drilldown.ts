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
  APPLY_FILTER_TRIGGER,
  IMAGE_CLICK_TRIGGER,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import { DASHBOARD_DRILLDOWN_TYPE } from '../../common/page_bundle_constants';
import { transformIn, transformOut } from './transforms';
import { dashboardDrilldownSchema } from './schemas';
import type { DashboardDrilldown, StoredDashboardDrilldown } from './types';

export function registerDashboardDrilldown(embeddableSetup: EmbeddableSetup) {
  embeddableSetup.registerDrilldown<StoredDashboardDrilldown, DashboardDrilldown>(
    DASHBOARD_DRILLDOWN_TYPE,
    {
      schema: dashboardDrilldownSchema,
      supportedTriggers: [APPLY_FILTER_TRIGGER, IMAGE_CLICK_TRIGGER],
      transformIn,
      transformOut,
    }
  );
}
