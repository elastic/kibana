/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { has } from 'lodash';

import { injectSearchSourceReferences } from '@kbn/data-plugin/public';
import { Filter, Query } from '@kbn/es-query';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';

import { cleanFiltersForSerialize } from '../../../utils/clean_filters_for_serialize';
import { getDashboardContentManagementCache } from '..';
import { convertPanelsArrayToPanelMap, injectReferences } from '../../../../common';
import type { DashboardGetIn, DashboardGetOut } from '../../../../server/content_management';
import { DASHBOARD_CONTENT_ID } from '../../../utils/telemetry_constants';
import { DEFAULT_DASHBOARD_STATE } from '../../../dashboard_api/default_dashboard_state';
import {
  contentManagementService,
  dataService,
  embeddableService,
  savedObjectsTaggingService,
} from '../../kibana_services';
import type {
  DashboardSearchSource,
  LoadDashboardFromSavedObjectProps,
  LoadDashboardReturn,
} from '../types';
import { convertNumberToDashboardVersion } from './dashboard_versioning';

export function migrateLegacyQuery(query: Query | { [key: string]: any } | string): Query {
  // Lucene was the only option before, so language-less queries are all lucene
  if (!has(query, 'language')) {
    return { query, language: 'lucene' };
  }

  return query as Query;
}

export const loadDashboardState = async ({
  id,
}: LoadDashboardFromSavedObjectProps): Promise<LoadDashboardReturn> => {
  const {
    search: dataSearchService,
    query: { queryString },
  } = dataService;
  const dashboardContentManagementCache = getDashboardContentManagementCache();

  const savedObjectId = id;

  const newDashboardState = { ...DEFAULT_DASHBOARD_STATE };

  /**
   * This is a newly created dashboard, so there is no saved object state to load.
   */
  if (!savedObjectId) {
    return {
      dashboardInput: newDashboardState,
      dashboardFound: true,
      newDashboardCreated: true,
      references: [],
    };
  }

  /**
   * Load the saved object from Content Management
   */
  let rawDashboardContent: DashboardGetOut['item'];
  let resolveMeta: DashboardGetOut['meta'];

  const cachedDashboard = dashboardContentManagementCache.fetchDashboard(id);
  if (cachedDashboard) {
    /** If the dashboard exists in the cache, use the cached version to load the dashboard */
    ({ item: rawDashboardContent, meta: resolveMeta } = cachedDashboard);
  } else {
    /** Otherwise, fetch and load the dashboard from the content management client, and add it to the cache */
    const result = await contentManagementService.client
      .get<DashboardGetIn, DashboardGetOut>({
        contentTypeId: DASHBOARD_CONTENT_ID,
        id,
      })
      .catch((e) => {
        throw new SavedObjectNotFound(DASHBOARD_CONTENT_ID, id);
      });

    ({ item: rawDashboardContent, meta: resolveMeta } = result);
    const { outcome: loadOutcome } = resolveMeta;
    if (loadOutcome !== 'aliasMatch') {
      /**
       * Only add the dashboard to the cache if it does not require a redirect - otherwise, the meta
       * alias info gets cached and prevents the dashboard contents from being updated
       */
      dashboardContentManagementCache.addDashboard(result);
    }
  }

  if (!rawDashboardContent || !rawDashboardContent.version) {
    return {
      dashboardInput: newDashboardState,
      dashboardFound: false,
      dashboardId: savedObjectId,
      references: [],
    };
  }

  /**
   * Inject saved object references back into the saved object attributes
   */
  const { references, attributes: rawAttributes, managed } = rawDashboardContent;
  const attributes = (() => {
    if (!references || references.length === 0) return rawAttributes;
    return injectReferences(
      { references, attributes: rawAttributes },
      {
        embeddablePersistableStateService: embeddableService,
      }
    );
  })();

  /**
   * Create search source and pull filters and query from it.
   */
  let searchSourceValues = attributes.kibanaSavedObjectMeta.searchSource;
  const searchSource = await (async () => {
    if (!searchSourceValues) {
      return await dataSearchService.searchSource.create();
    }
    try {
      searchSourceValues = injectSearchSourceReferences(
        searchSourceValues as any,
        references
      ) as DashboardSearchSource;
      return await dataSearchService.searchSource.create(searchSourceValues);
    } catch (error: any) {
      return await dataSearchService.searchSource.create();
    }
  })();

  const filters = cleanFiltersForSerialize((searchSource?.getOwnField('filter') as Filter[]) ?? []);

  const query = migrateLegacyQuery(
    searchSource?.getOwnField('query') || queryString.getDefaultQuery() // TODO SAVED DASHBOARDS determine if migrateLegacyQuery is still needed
  );

  const {
    refreshInterval,
    description,
    timeRestore,
    options,
    panels,
    timeFrom,
    version,
    timeTo,
    title,
  } = attributes;

  const timeRange =
    timeRestore && timeFrom && timeTo
      ? {
          from: timeFrom,
          to: timeTo,
        }
      : undefined;

  const panelMap = convertPanelsArrayToPanelMap(panels ?? []);

  return {
    managed,
    references,
    resolveMeta,
    dashboardInput: {
      ...DEFAULT_DASHBOARD_STATE,
      ...options,
      refreshInterval,
      timeRestore,
      description,
      timeRange,
      filters,
      panels: panelMap,
      query,
      title,

      viewMode: 'view', // dashboards loaded from saved object default to view mode. If it was edited recently, the view mode from session storage will override this.
      tags:
        savedObjectsTaggingService?.getTaggingApi()?.ui.getTagIdsFromReferences(references) ?? [],

      controlGroupInput: attributes.controlGroupInput,

      ...(version && { version: convertNumberToDashboardVersion(version) }),
    },
    dashboardFound: true,
    dashboardId: savedObjectId,
  };
};
