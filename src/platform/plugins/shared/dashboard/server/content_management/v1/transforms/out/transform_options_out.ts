/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flow } from 'lodash';
import { DEFAULT_DASHBOARD_OPTIONS } from '../../../../../common/content_management';
import { DashboardAttributes } from '../../types';

export function transformOptionsOut(optionsJSON: string): DashboardAttributes['options'] {
  return flow(JSON.parse, transformOptionsSetDefaults, transformOptionsProperties)(optionsJSON);
}

// TODO We may want to remove setting defaults in the future
function transformOptionsSetDefaults(options: DashboardAttributes['options']) {
  return {
    ...DEFAULT_DASHBOARD_OPTIONS,
    ...options,
  };
}

function transformOptionsProperties({
  hidePanelTitles,
  useMargins,
  syncColors,
  syncCursor,
  syncTooltips,
}: DashboardAttributes['options']) {
  return {
    hidePanelTitles,
    useMargins,
    syncColors,
    syncCursor,
    syncTooltips,
  };
}
