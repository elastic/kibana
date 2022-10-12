/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ReactElement } from 'react';

import { Filter } from '@kbn/es-query';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import { rawControlGroupAttributesToControlGroupInput } from '@kbn/controls-plugin/common';
import { parseSearchSourceJSON, injectSearchSourceReferences } from '@kbn/data-plugin/public';
import { SavedObjectAttributes, SavedObjectsClientContract, ScopedHistory } from '@kbn/core/public';

import { migrateLegacyQuery } from '../../../application/lib/migrate_legacy_query';

import {
  DashboardConstants,
  defaultDashboardState,
  createDashboardEditUrl,
} from '../../../dashboard_constants';
import type { DashboardAttributes } from '../../../application';
import { DashboardSavedObjectRequiredServices } from '../types';
import { DashboardOptions, DashboardState } from '../../../types';
import { cleanFiltersForSerialize } from '../../../application/lib';
import { convertSavedPanelsToPanelMap, injectReferences } from '../../../../common';

export type LoadDashboardFromSavedObjectProps = DashboardSavedObjectRequiredServices & {
  id?: string;
  getScopedHistory?: () => ScopedHistory;
  savedObjectsClient: SavedObjectsClientContract;
};

export interface LoadDashboardFromSavedObjectReturn {
  redirectedToAlias?: boolean;
  dashboardState?: DashboardState;
  createConflictWarning?: () => ReactElement | undefined;
}

type SuccessfulLoadDashboardFromSavedObjectReturn = LoadDashboardFromSavedObjectReturn & {
  dashboardState: DashboardState;
};

export const dashboardStateLoadWasSuccessful = (
  incoming?: LoadDashboardFromSavedObjectReturn
): incoming is SuccessfulLoadDashboardFromSavedObjectReturn => {
  return Boolean(incoming && incoming?.dashboardState && !incoming.redirectedToAlias);
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

  /**
   * This is a newly created dashboard, so there is no saved object state to load.
   */
  if (!id) return { dashboardState: defaultDashboardState };

  /**
   * Load the saved object
   */
  const {
    outcome,
    alias_purpose: aliasPurpose,
    alias_target_id: aliasId,
    saved_object: rawDashboardSavedObject,
  } = await savedObjectsClient.resolve<DashboardAttributes>(
    DashboardConstants.DASHBOARD_SAVED_OBJECT_TYPE,
    id
  );
  if (!rawDashboardSavedObject._version) {
    throw new SavedObjectNotFound(DashboardConstants.DASHBOARD_SAVED_OBJECT_TYPE, id);
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
  if (scopedHistory && outcome === 'aliasMatch' && id && aliasId) {
    const path = scopedHistory.location.hash.replace(id, aliasId);
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
            currentObjectId: id,
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
    dashboardState: {
      ...defaultDashboardState,

      savedObjectId: id,
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
