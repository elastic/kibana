/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import uuid from 'uuid';
import { has } from 'lodash';
import { ReactElement } from 'react';

import { Filter, Query } from '@kbn/es-query';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import { rawControlGroupAttributesToControlGroupInput } from '@kbn/controls-plugin/common';
import { parseSearchSourceJSON, injectSearchSourceReferences } from '@kbn/data-plugin/public';
import { SavedObjectAttributes, SavedObjectsClientContract, ScopedHistory } from '@kbn/core/public';

import {
  createDashboardEditUrl,
  DASHBOARD_SAVED_OBJECT_TYPE,
  DEFAULT_DASHBOARD_INPUT,
} from '../../../dashboard_constants';
import { DashboardSavedObjectRequiredServices } from '../types';
import {
  convertSavedPanelsToPanelMap,
  DashboardAttributes,
  DashboardContainerByValueInput,
  DashboardOptions,
  injectReferences,
} from '../../../../common';

export function migrateLegacyQuery(query: Query | { [key: string]: any } | string): Query {
  // Lucene was the only option before, so language-less queries are all lucene
  if (!has(query, 'language')) {
    return { query, language: 'lucene' };
  }

  return query as Query;
}

export type LoadDashboardFromSavedObjectProps = DashboardSavedObjectRequiredServices & {
  id?: string;
  getScopedHistory?: () => ScopedHistory;
  savedObjectsClient: SavedObjectsClientContract;
};

export interface LoadDashboardFromSavedObjectReturn {
  redirectedToAlias?: boolean;
  dashboardInput?: DashboardContainerByValueInput;
  createConflictWarning?: () => ReactElement | undefined;
}

type SuccessfulLoadDashboardFromSavedObjectReturn = LoadDashboardFromSavedObjectReturn & {
  dashboardInput: DashboardContainerByValueInput;
};

export const dashboardStateLoadWasSuccessful = (
  incoming?: LoadDashboardFromSavedObjectReturn
): incoming is SuccessfulLoadDashboardFromSavedObjectReturn => {
  return Boolean(incoming && incoming?.dashboardInput && !incoming.redirectedToAlias);
};

const cleanFiltersForSerialize = (filters: Filter[]): Filter[] => {
  return filters.map((filter) => {
    if (filter.meta.value) delete filter.meta.value;
    return filter;
  });
};

export const loadDashboardStateFromSavedObject = async ({
  savedObjectsTagging,
  savedObjectsClient,
  getScopedHistory,
  screenshotMode,
  embeddable,
  spaces,
  data,
  id,
}: LoadDashboardFromSavedObjectProps): Promise<LoadDashboardFromSavedObjectReturn> => {
  const {
    search: dataSearchService,
    query: { queryString },
  } = data;

  const savedObjectId = id;
  const embeddableId = uuid.v4();

  /**
   * This is a newly created dashboard, so there is no saved object state to load.
   */
  if (!savedObjectId) return { dashboardInput: { ...DEFAULT_DASHBOARD_INPUT, id: embeddableId } };

  /**
   * Load the saved object
   */
  const {
    outcome,
    alias_purpose: aliasPurpose,
    alias_target_id: aliasId,
    saved_object: rawDashboardSavedObject,
  } = await savedObjectsClient.resolve<DashboardAttributes>(
    DASHBOARD_SAVED_OBJECT_TYPE,
    savedObjectId
  );
  if (!rawDashboardSavedObject._version) {
    throw new SavedObjectNotFound(DASHBOARD_SAVED_OBJECT_TYPE, savedObjectId);
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
   * Handle saved object resolve alias outcome by redirecting
   */
  const scopedHistory = getScopedHistory?.();
  if (scopedHistory && outcome === 'aliasMatch' && savedObjectId && aliasId) {
    const path = scopedHistory.location.hash.replace(savedObjectId, aliasId);
    if (screenshotMode.isScreenshotMode()) {
      scopedHistory.replace(path);
    } else {
      await spaces.redirectLegacyUrl?.({ path, aliasPurpose });
    }
    return { redirectedToAlias: true };
  }

  /**
   * Create conflict warning component if there is a saved object id conflict
   */
  const createConflictWarning =
    scopedHistory && outcome === 'conflict' && aliasId
      ? () =>
          spaces.getLegacyUrlConflict?.({
            currentObjectId: savedObjectId,
            otherObjectId: aliasId,
            otherObjectPath: `#${createDashboardEditUrl(aliasId)}${scopedHistory.location.search}`,
          })
      : undefined;

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
    createConflictWarning,
    dashboardInput: {
      ...DEFAULT_DASHBOARD_INPUT,

      id: embeddableId,
      refreshInterval,
      timeRestore,
      description,
      timeRange,
      options,
      filters,
      panels,
      title,
      query,

      viewMode: ViewMode.VIEW, // dashboards loaded from saved object default to view mode. If it was edited recently, the view mode from session storage will override this.
      tags: savedObjectsTagging.getTagIdsFromReferences?.(references) ?? [],

      controlGroupInput:
        attributes.controlGroupInput &&
        rawControlGroupAttributesToControlGroupInput(attributes.controlGroupInput),
    },
  };
};
