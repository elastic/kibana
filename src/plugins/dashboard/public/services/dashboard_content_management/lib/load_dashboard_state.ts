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
import { rawControlGroupAttributesToControlGroupInput } from '@kbn/controls-plugin/common';
import { parseSearchSourceJSON, injectSearchSourceReferences } from '@kbn/data-plugin/public';

import {
  injectReferences,
  type DashboardOptions,
  convertSavedPanelsToPanelMap,
} from '../../../../common';
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
    return { dashboardInput: newDashboardState, dashboardFound: true, newDashboardCreated: true };
  }

  /**
   * Load the saved object from Content Management
   */
  let rawDashboardContent;
  let resolveMeta;

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

    dashboardContentManagementCache.addDashboard(result);
    ({ item: rawDashboardContent, meta: resolveMeta } = result);
  }

  if (!rawDashboardContent || !rawDashboardContent.version) {
    return {
      dashboardInput: newDashboardState,
      dashboardFound: false,
      dashboardId: savedObjectId,
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
  const searchSourceJSON = attributes.kibanaSavedObjectMeta.searchSourceJSON;
  const searchSource = await (async () => {
    if (!searchSourceJSON) {
      return await dataSearchService.searchSource.create();
    }
    try {
      let searchSourceValues = parseSearchSourceJSON(searchSourceJSON);
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
    optionsJSON,
    panelsJSON,
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

  /**
   * Parse panels and options from JSON
   */
  const options: DashboardOptions = optionsJSON ? JSON.parse(optionsJSON) : undefined;
  const panels = convertSavedPanelsToPanelMap(panelsJSON ? JSON.parse(panelsJSON) : []);

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
      panels,
      query,
      title,

      viewMode: ViewMode.VIEW, // dashboards loaded from saved object default to view mode. If it was edited recently, the view mode from session storage will override this.
      tags: savedObjectsTagging.getTagIdsFromReferences?.(references) ?? [],

      controlGroupInput:
        attributes.controlGroupInput &&
        rawControlGroupAttributesToControlGroupInput(attributes.controlGroupInput),

      version: convertNumberToDashboardVersion(version),
    },
    embeddable
  );

  return {
    managed,
    resolveMeta,
    dashboardInput,
    anyMigrationRun,
    dashboardFound: true,
    dashboardId: savedObjectId,
  };
};
