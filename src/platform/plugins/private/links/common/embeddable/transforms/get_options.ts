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
      ...(typeof dashboardOptions?.use_filters === 'boolean' && {
        use_filters: dashboardOptions.use_filters,
      }),
      ...(typeof dashboardOptions?.use_time_range === 'boolean' && {
        use_time_range: dashboardOptions.use_time_range,
      }),
    };
  }

  const urlOptions = options as Required<ExternalLink>['options'];
  return {
    ...(typeof urlOptions.openInNewTab === 'boolean' && { openInNewTab: urlOptions.openInNewTab }),
    ...(typeof urlOptions.encodeUrl === 'boolean' && { encodeUrl: urlOptions.encodeUrl }),
  };
}
