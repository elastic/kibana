/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Location } from 'history';

/**
 * List of visualization app paths in Kibana
 */
const VIZ_APPS = ['/app/visualize', '/app/maps', '/app/lens'];

/**
 * Checks if a query parameter exists in either the search string or hash fragment.
 * This handles Kibana's dual URL param locations.
 *
 * @param location - The history Location object
 * @param paramName - The parameter name to search for
 * @param paramValue - Optional parameter value to match
 * @returns true if the parameter exists (with the value if specified)
 */
export function hasQueryParam(location: Location, paramName: string, paramValue?: string): boolean {
  const searchString = location.search || '';
  const hashString = location.hash || '';

  const searchToCheck = paramValue ? `${paramName}=${paramValue}` : `${paramName}=`;

  return searchString.includes(searchToCheck) || hashString.includes(searchToCheck);
}

/**
 * Checks if the current location is editing a visualization that originated from dashboards.
 * This is used to determine navigation active states when editing visualizations from Dashboard.
 *
 * @param location - The history Location object
 * @param pathNameSerialized - The serialized pathname from getIsActive
 * @param prepend - The prepend function from getIsActive
 * @returns true if editing a viz from Dashboard
 */
export function isEditingFromDashboard(
  location: Location,
  pathNameSerialized: string,
  prepend: (path: string) => string
): boolean {
  const isVizApp = VIZ_APPS.some((app) => pathNameSerialized.startsWith(prepend(app)));
  const hasOriginatingApp = hasQueryParam(location, 'originatingApp', 'dashboards');

  return isVizApp && hasOriginatingApp;
}
