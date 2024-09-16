/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { v4 as uuidv4 } from 'uuid';
import { has } from 'lodash';

import { Filter, Query } from '@kbn/es-query';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import { cleanFiltersForSerialize } from '@kbn/presentation-util-plugin/public';
import { injectSearchSourceReferences } from '@kbn/data-plugin/public';

import { injectReferences, convertSavedPanelsToPanelMap } from '../../../../common';
import { migrateDashboardInput } from './migrate_dashboard_input';
import { convertNumberToDashboardVersion } from './dashboard_versioning';
import { DashboardCrudTypes } from '../../../../common/content_management';
import type { LoadDashboardFromSavedObjectProps, LoadDashboardReturn } from '../types';
import { dashboardContentManagementCache } from '../dashboard_content_management_service';
import { DASHBOARD_CONTENT_ID, DEFAULT_DASHBOARD_INPUT } from '../../../dashboard_constants';

export function migrateLegacyQuery(query: Query | { [key: string]: any } | string): Query {
  // Lucene was the only option before, so language-less queries are all lucene
  if (!has(query, 'language')) {
    return { query, language: 'lucene' };
  }

  return query as Query;
}

export const loadDashboardState = async ({
  id,
  data,
  embeddable,
  contentManagement,
  savedObjectsTagging,
}: LoadDashboardFromSavedObjectProps): Promise<LoadDashboardReturn> => {
  const {
    search: dataSearchService,
    query: { queryString },
  } = data;

  const savedObjectId = id;
  const embeddableId = uuidv4();

  const newDashboardState = { ...DEFAULT_DASHBOARD_INPUT, id: embeddableId };

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
  let rawDashboardContent: DashboardCrudTypes['GetOut']['item'];
  let resolveMeta: DashboardCrudTypes['GetOut']['meta'];

  const cachedDashboard = dashboardContentManagementCache.fetchDashboard(id);
  if (cachedDashboard) {
    /** If the dashboard exists in the cache, use the cached version to load the dashboard */
    ({ item: rawDashboardContent, meta: resolveMeta } = cachedDashboard);
  } else {
    /** Otherwise, fetch and load the dashboard from the content management client, and add it to the cache */
    const result = await contentManagement.client
      .get<DashboardCrudTypes['GetIn'], DashboardCrudTypes['GetOut']>({
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
        embeddablePersistableStateService: embeddable,
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
      searchSourceValues = injectSearchSourceReferences(searchSourceValues as any, references);
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

  const panelMap = convertSavedPanelsToPanelMap(panels ?? []);

  const { dashboardInput, anyMigrationRun } = migrateDashboardInput(
    {
      ...DEFAULT_DASHBOARD_INPUT,
      ...options,

      id: embeddableId,
      refreshInterval,
      timeRestore,
      description,
      timeRange,
      filters,
      panels: panelMap,
      query,
      title,

      viewMode: ViewMode.VIEW, // dashboards loaded from saved object default to view mode. If it was edited recently, the view mode from session storage will override this.
      tags: savedObjectsTagging.getTagIdsFromReferences?.(references) ?? [],

      controlGroupInput: attributes.controlGroupInput,

      version: convertNumberToDashboardVersion(version),
    },
    embeddable
  );

  return {
    managed,
    references,
    resolveMeta,
    dashboardInput,
    anyMigrationRun,
    dashboardFound: true,
    dashboardId: savedObjectId,
  };
};
