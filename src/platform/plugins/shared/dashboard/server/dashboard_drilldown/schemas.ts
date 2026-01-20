/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { DASHBOARD_DRILLDOWN_TYPE } from '../../common/page_bundle_constants';
import { dashboardNavigationOptionsSchema } from '../dashboard_navigation';

export const dashboardDrilldownSchema = dashboardNavigationOptionsSchema.extends({
  dashboard_id: schema.string(),
  type: schema.literal(DASHBOARD_DRILLDOWN_TYPE),
});
