/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExceptionListFilter, NamespaceType } from '@kbn/securitysolution-io-ts-list-types';
import { getGeneralFilters } from '../get_general_filters';
import { getSavedObjectTypes } from '../get_saved_object_types';
import { getTrustedAppsFilter } from '../get_trusted_apps_filter';
import { getEventFiltersFilter } from '../get_event_filters_filter';
import { getHostIsolationExceptionsFilter } from '../get_host_isolation_exceptions_filter';

export interface GetFiltersParams {
  filters: ExceptionListFilter;
  namespaceTypes: NamespaceType[];
  showTrustedApps: boolean;
  showEventFilters: boolean;
  showHostIsolationExceptions: boolean;
}

export const getFilters = ({
  filters,
  namespaceTypes,
  showTrustedApps,
  showEventFilters,
  showHostIsolationExceptions,
}: GetFiltersParams): string => {
  const namespaces = getSavedObjectTypes({ namespaceType: namespaceTypes });
  const generalFilters = getGeneralFilters(filters, namespaces);
  const trustedAppsFilter = getTrustedAppsFilter(showTrustedApps, namespaces);
  const eventFiltersFilter = getEventFiltersFilter(showEventFilters, namespaces);
  const hostIsolationExceptionsFilter = getHostIsolationExceptionsFilter(
    showHostIsolationExceptions,
    namespaces
  );
  return [generalFilters, trustedAppsFilter, eventFiltersFilter, hostIsolationExceptionsFilter]
    .filter((filter) => filter.trim() !== '')
    .join(' AND ');
};
