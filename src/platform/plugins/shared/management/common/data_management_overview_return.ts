/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Query flag set on preview links opened from the data management overview. */
export const DATA_MANAGEMENT_OVERVIEW_RETURN_PARAM = 'returnTo';

/** Value of {@link DATA_MANAGEMENT_OVERVIEW_RETURN_PARAM} for the overview page. */
export const DATA_MANAGEMENT_OVERVIEW_RETURN_VALUE = 'data_management_overview';

/** In-app path of the overview, under the Management application's Data section. */
export const DATA_MANAGEMENT_OVERVIEW_PATH = '/data/data_management_overview';

/** True when this URL was opened from the data management overview. */
export const cameFromDataManagementOverview = (search: string): boolean =>
  new URLSearchParams(search).get(DATA_MANAGEMENT_OVERVIEW_RETURN_PARAM) ===
  DATA_MANAGEMENT_OVERVIEW_RETURN_VALUE;

/** Appends the overview return flag without re-encoding the existing query. */
export const withDataManagementOverviewReturn = (path: string): string => {
  const joiner = path.includes('?') ? '&' : '?';
  return `${path}${joiner}${DATA_MANAGEMENT_OVERVIEW_RETURN_PARAM}=${DATA_MANAGEMENT_OVERVIEW_RETURN_VALUE}`;
};
