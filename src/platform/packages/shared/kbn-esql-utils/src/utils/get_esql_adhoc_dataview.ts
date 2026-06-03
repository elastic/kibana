/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { HttpStart } from '@kbn/core/public';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import { type ESQLSourceResult, SOURCES_AUTOCOMPLETE_ROUTE } from '@kbn/esql-types';
import { getIndexPatternFromESQLQuery } from './get_index_pattern_from_query';
import { getESQLTimeFieldFromQuery } from './get_esql_time_field_from_query';

// uses browser sha256 method with fallback if unavailable
async function sha256(str: string) {
  if (crypto.subtle) {
    const enc = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', enc.encode(str));
    return Array.from(new Uint8Array(hash))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('');
  } else {
    const { sha256: sha256fn } = await import('./sha256');
    return sha256fn(str);
  }
}

/**
 * Creates an ad-hoc DataView for ES|QL queries.
 *
 * Some applications need to have a DataView to work properly with ES|QL queries.
 * This helper creates an ad-hoc DataView with an ID constructed from the index pattern.
 * Since there are no runtime fields, field formatters, or default time fields,
 * the same ad-hoc DataView can be constructed/reused, which solves caching issues
 * described in https://github.com/elastic/kibana/issues/168131.
 *
 * The function automatically detects the time field by making an HTTP request to determine
 * if '@timestamp' exists across all indices in the query. If all indices contain the field,
 * it sets '@timestamp' as the time field; otherwise, no time field is set.
 *
 * @param dataViewsService - The DataViews service instance used to create the DataView
 * @param query - The ES|QL query string to extract the index pattern from
 * @param options - Optional configuration for DataView creation
 * @param options.allowNoIndex - Whether to allow creating a DataView for non-existent indices
 * @param options.skipFetchFields - Whether to skip fetching fields for performance reasons
 * @param options.createNewInstanceEvenIfCachedOneAvailable - Forces creation of a new instance by clearing the cached DataView instance and cached time field lookup for the query
 * @param options.id - Explicit DataView ID. When provided, this ID is used as-is instead of generating one via SHA-256. Useful when the caller already knows the ID (e.g. from a persisted ad-hoc DataView spec) and wants the DataViewService cache to be populated under that exact key.
 * @param options.idPrefix - Custom prefix for the DataView ID (defaults to 'esql'). Use a different prefix to avoid cache collisions between consumers.
 * @param http - Optional HTTP service for fetching time field information. If not provided, no time field detection is performed
 *
 * @returns Promise that resolves to the created DataView with the detected time field (if any)
 *
 */
export async function getESQLAdHocDataview({
  dataViewsService,
  query,
  options,
  http,
}: {
  // the data views service to use to create the data view
  dataViewsService: DataViewsPublicPluginStart;
  // the ES|QL query to extract the index pattern from
  query: string;
  options?: {
    allowNoIndex?: boolean;
    createNewInstanceEvenIfCachedOneAvailable?: boolean;
    skipFetchFields?: boolean;
    id?: string;
    idPrefix?: string;
  };
  // optional http service to use to fetch the time field, if needed
  http?: HttpStart;
}) {
  const timeFieldName = await getESQLTimeFieldFromQuery({ query, http });

  const indexPattern = getIndexPatternFromESQLQuery(query);
  const prefix = options?.idPrefix ?? 'esql';
  const dataViewId =
    options?.id ??
    (await sha256(
      timeFieldName ? `${prefix}-${indexPattern}-${timeFieldName}` : `${prefix}-${indexPattern}`
    ));

  if (options?.createNewInstanceEvenIfCachedOneAvailable) {
    // overwise it might return a cached data view with a different time field
    dataViewsService.clearInstanceCache(dataViewId);
  }

  const skipFetchFields = options?.skipFetchFields ?? false;

  const dataView = await dataViewsService.create(
    {
      title: indexPattern,
      type: ESQL_TYPE,
      id: dataViewId,
      allowNoIndex: options?.allowNoIndex,
      timeFieldName: timeFieldName || undefined,
    },
    // important to skip if you just need the dataview without the fields for performance reasons
    skipFetchFields
  );
  return dataView;
}

/**
 * Gets an initial index for a default ES|QL query by querying both local and remote (CCS) indices.
 * Could be used during onboarding when data views to get a better index are not yet available.
 * Can be used in combination with {@link getESQLAdHocDataview} to create a dataview for the index.
 *
 * Prefers a local `logs*` pattern if any local index starts with "logs",
 * otherwise returns the first available non-hidden index (local or remote).
 */
export async function getIndexForESQLQuery(deps: { http: HttpStart }): Promise<string | null> {
  const fetchIndices = async (scope: 'local' | 'all' | 'remote') => {
    const response = await deps.http.get(`${SOURCES_AUTOCOMPLETE_ROUTE}${scope}`).catch(() => []);
    return (response as ESQLSourceResult[]).filter((source) => !source.hidden);
  };

  let indices = await fetchIndices('local');
  // only if no local indices are found, try to fetch remote indices
  if (indices.length === 0) {
    indices = await fetchIndices('remote');
  }

  if (indices.length === 0) return null;

  const hasLocalLogs = indices.some(
    (source) => !source.name.includes(':') && source.name.startsWith('logs')
  );
  if (hasLocalLogs) return 'logs*';

  return indices[0].name;
}
