/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS } from "@kbn/presentation-util-plugin/common";
import type { DashboardLink, ExternalLink, LinkOptions } from "../../../server";
import { DASHBOARD_LINK_TYPE, LinkType } from "../../content_management";
import { DEFAULT_URL_DRILLDOWN_OPTIONS } from "@kbn/ui-actions-enhanced-plugin/common";

export function getOptions(type: LinkType, options: LinkOptions) {
  if (!options) return undefined;

  if (type === DASHBOARD_LINK_TYPE) {
    const dashboardOptions = options as Required<DashboardLink>['options'];
    return {
      ...DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
      ...(typeof dashboardOptions.openInNewTab === 'boolean' && { openInNewTab: dashboardOptions.openInNewTab }),
      ...(typeof dashboardOptions.useCurrentFilters === 'boolean' && { useCurrentFilters: dashboardOptions.useCurrentFilters }),
      ...(typeof dashboardOptions.useCurrentDateRange === 'boolean' && { useCurrentDateRange: dashboardOptions.useCurrentDateRange }),
    };
  }

  const urlOptions = options as Required<ExternalLink>['options'];
  return {
    ...DEFAULT_URL_DRILLDOWN_OPTIONS,
    ...(typeof urlOptions.openInNewTab === 'boolean' && { openInNewTab: urlOptions.openInNewTab }),
    ...(typeof urlOptions.encodeUrl === 'boolean' && { encodeUrl: urlOptions.encodeUrl }),
  };
}
