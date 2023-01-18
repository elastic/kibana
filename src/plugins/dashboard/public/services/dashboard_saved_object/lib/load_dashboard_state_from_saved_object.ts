/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { v4 as uuid } from 'uuid';
import { has } from 'lodash';

import {
  ResolvedSimpleSavedObject,
  SavedObjectAttributes,
  SavedObjectsClientContract,
} from '@kbn/core/public';
import { Filter, Query } from '@kbn/es-query';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { cleanFiltersForSerialize } from '@kbn/presentation-util-plugin/public';
import { rawControlGroupAttributesToControlGroupInput } from '@kbn/controls-plugin/common';
import { parseSearchSourceJSON, injectSearchSourceReferences } from '@kbn/data-plugin/public';

import {
  DashboardContainerByValueInput,
  convertSavedPanelsToPanelMap,
  DashboardAttributes,
  DashboardOptions,
  injectReferences,
} from '../../../../common';
import { DashboardSavedObjectRequiredServices } from '../types';
import { DASHBOARD_SAVED_OBJECT_TYPE, DEFAULT_DASHBOARD_INPUT } from '../../../dashboard_constants';

export function migrateLegacyQuery(query: Query | { [key: string]: any } | string): Query {
  // Lucene was the only option before, so language-less queries are all lucene
  if (!has(query, 'language')) {
    return { query, language: 'lucene' };
  }

  return query as Query;
}

export type LoadDashboardFromSavedObjectProps = DashboardSavedObjectRequiredServices & {
  id?: string;
  savedObjectsClient: SavedObjectsClientContract;
};

export interface LoadDashboardFromSavedObjectReturn {
  dashboardFound: boolean;
  dashboardId?: string;
  resolveMeta?: Omit<ResolvedSimpleSavedObject, 'saved_object'>;
  dashboardInput: DashboardContainerByValueInput;
}

export const loadDashboardStateFromSavedObject = async ({
  savedObjectsTagging,
  savedObjectsClient,
  embeddable,
  data,
  id,
}: LoadDashboardFromSavedObjectProps): Promise<LoadDashboardFromSavedObjectReturn> => {
  const {
    search: dataSearchService,
    query: { queryString },
  } = data;

  const savedObjectId = id;
  const embeddableId = uuid.v4();

  const newDashboardState = { ...DEFAULT_DASHBOARD_INPUT, id: embeddableId };

  /**
   * This is a newly created dashboard, so there is no saved object state to load.
   */
  if (!savedObjectId) return { dashboardInput: newDashboardState, dashboardFound: true };

  /**
   * Load the saved object
   */
  const { saved_object: rawDashboardSavedObject, ...resolveMeta } =
    await savedObjectsClient.resolve<DashboardAttributes>(
      DASHBOARD_SAVED_OBJECT_TYPE,
      savedObjectId
    );
  if (!rawDashboardSavedObject._version) {
    return { dashboardInput: newDashboardState, dashboardFound: false, dashboardId: savedObjectId };
  }

  /**
   * Inject saved object references back into the saved object attributes
   */
  const { references, attributes: rawAttributes } = rawDashboardSavedObject;
  const attributes = (() => {
    if (!references || references.length === 0) return rawAttributes;
    return injectReferences(
      { references, attributes: rawAttributes as unknown as SavedObjectAttributes },
      {
        embeddablePersistableStateService: embeddable,
      }
    ) as unknown as DashboardAttributes;
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

  return {
    resolveMeta,
    dashboardFound: true,
    dashboardId: savedObjectId,
    dashboardInput: {
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
    },
  };
};
