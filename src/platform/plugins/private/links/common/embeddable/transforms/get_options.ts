/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardLink, ExternalLink, LinkOptions } from '../../../server';
import type { LinkType } from '../../content_management';
import { DASHBOARD_LINK_TYPE } from '../../content_management';

export function getOptions(type: LinkType, options: LinkOptions) {
  if (!options) return undefined;

  if (type === DASHBOARD_LINK_TYPE) {
    const dashboardOptions = options as DashboardLink['options'];
    return {
      ...(typeof dashboardOptions?.open_in_new_tab === 'boolean' && {
        open_in_new_tab: dashboardOptions.open_in_new_tab,
      }),
      // <9.4 stored as openInNewTab
      ...(typeof (dashboardOptions as { openInNewTab?: boolean })?.openInNewTab === 'boolean' && {
        open_in_new_tab: (dashboardOptions as { openInNewTab?: boolean }).openInNewTab,
      }),
      ...(typeof dashboardOptions?.use_filters === 'boolean' && {
        use_filters: dashboardOptions.use_filters,
      }),
      // <9.4 stored as useCurrentFilters
      ...(typeof (dashboardOptions as { useCurrentFilters?: boolean })?.useCurrentFilters ===
        'boolean' && {
        use_filters: (dashboardOptions as { useCurrentFilters?: boolean }).useCurrentFilters,
      }),
      ...(typeof dashboardOptions?.use_time_range === 'boolean' && {
        use_time_range: dashboardOptions.use_time_range,
      }),
      // <9.4 stored as useCurrentDateRange
      ...(typeof (dashboardOptions as { useCurrentDateRange?: boolean })?.useCurrentDateRange ===
        'boolean' && {
        use_time_range: (dashboardOptions as { useCurrentDateRange?: boolean }).useCurrentDateRange,
      }),
    } as DashboardLink['options'];
  }

  const urlOptions = options as Required<ExternalLink>['options'];
  return {
    ...(typeof urlOptions.openInNewTab === 'boolean' && { openInNewTab: urlOptions.openInNewTab }),
    ...(typeof urlOptions.encodeUrl === 'boolean' && { encodeUrl: urlOptions.encodeUrl }),
  };
}
