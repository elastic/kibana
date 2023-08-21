/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UrlDrilldownOptions } from '@kbn/ui-actions-enhanced-plugin/common';
import { DashboardDrilldownOptions } from '@kbn/presentation-util-plugin/common';

/**
 * Link types
 */
export const DASHBOARD_LINK_TYPE = 'dashboardLink';
export const EXTERNAL_LINK_TYPE = 'externalLink';

/**
 * Link options
 */
export const DEFAULT_DASHBOARD_LINK_OPTIONS: DashboardDrilldownOptions = {
  openInNewTab: false,
  useCurrentDateRange: true,
  useCurrentFilters: true,
};

export const DEFAULT_URL_LINK_OPTIONS: UrlDrilldownOptions = {
  encodeUrl: true,
  openInNewTab: true,
};

/**
 * Layout options
 */
export const NAV_HORIZONTAL_LAYOUT = 'horizontal';
export const NAV_VERTICAL_LAYOUT = 'vertical';
