/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pick } from 'lodash';
import moment, { Moment } from 'moment';
import { isFilterPinned } from '@kbn/es-query';
import type { SavedObjectReference } from '@kbn/core/server';
import { RefreshInterval, extractSearchSourceReferences } from '@kbn/data-plugin/public';

import {
  convertPanelMapToPanelsArray,
  extractReferences,
  generateNewPanelIds,
} from '../../../../common';
import type { DashboardAttributes } from '../../../../server';

import { convertDashboardVersionToNumber } from './dashboard_versioning';
import { DashboardSearchSource, GetDashboardStateProps } from '../types';
import { dataService, embeddableService, savedObjectsTaggingService } from '../../kibana_services';
import { LATEST_DASHBOARD_CONTAINER_VERSION } from '../../../dashboard_container';

export const convertTimeToUTCString = (time?: string | Moment): undefined | string => {
  if (moment(time).isValid()) {
    return moment(time).utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
  } else {
    // If it's not a valid moment date, then it should be a string representing a relative time
    // like 'now' or 'now-15m'.
    return time as string;
  }
};

export const getDashboardState = async ({
  controlGroupReferences,
  generateNewIds,
  currentState,
  panelReferences,
}: GetDashboardStateProps) => {
  const {
    search: dataSearchService,
    query: {
      timefilter: { timefilter },
    },
  } = dataService;

  const {
    tags,
    query,
    title,
    filters,
    timeRestore,
    description,

    // Dashboard options
    useMargins,
    syncColors,
    syncCursor,
    syncTooltips,
    hidePanelTitles,
    controlGroupInput,
  } = currentState;

  let { panels } = currentState;
  let prefixedPanelReferences = panelReferences;
  if (generateNewIds) {
    const { panels: newPanels, references: newPanelReferences } = generateNewPanelIds(
      panels,
      panelReferences
    );
    panels = newPanels;
    prefixedPanelReferences = newPanelReferences;
    //
    // do not need to generate new ids for controls.
    // ControlGroup Component is keyed on dashboard id so changing dashboard id mounts new ControlGroup Component.
    //
  }

  const { searchSource, searchSourceReferences } = await (async () => {
    const searchSourceFields = await dataSearchService.searchSource.create();
    searchSourceFields.setField(
      'filter', // save only unpinned filters
      filters.filter((filter) => !isFilterPinned(filter))
    );
    searchSourceFields.setField('query', query);

    const rawSearchSourceFields = searchSourceFields.getSerializedFields();
    const [fields, references] = extractSearchSourceReferences(rawSearchSourceFields) as [
      DashboardSearchSource,
      SavedObjectReference[]
    ];
    return { searchSourceReferences: references, searchSource: fields };
  })();

  const options = {
    useMargins,
    syncColors,
    syncCursor,
    syncTooltips,
    hidePanelTitles,
  };
  const savedPanels = convertPanelMapToPanelsArray(panels, true);

  /**
   * Parse global time filter settings
   */
  const { from, to } = timefilter.getTime();
  const timeFrom = timeRestore ? convertTimeToUTCString(from) : undefined;
  const timeTo = timeRestore ? convertTimeToUTCString(to) : undefined;
  const refreshInterval = timeRestore
    ? (pick(timefilter.getRefreshInterval(), [
        'display',
        'pause',
        'section',
        'value',
      ]) as RefreshInterval)
    : undefined;

  const rawDashboardAttributes: DashboardAttributes = {
    version: convertDashboardVersionToNumber(LATEST_DASHBOARD_CONTAINER_VERSION),
    controlGroupInput: controlGroupInput as DashboardAttributes['controlGroupInput'],
    kibanaSavedObjectMeta: { searchSource },
    description: description ?? '',
    refreshInterval,
    timeRestore,
    options,
    panels: savedPanels,
    timeFrom,
    title,
    timeTo,
  };

  /**
   * Extract references from raw attributes and tags into the references array.
   */
  const { attributes, references: dashboardReferences } = extractReferences(
    {
      attributes: rawDashboardAttributes,
      references: searchSourceReferences,
    },
    { embeddablePersistableStateService: embeddableService }
  );

  const savedObjectsTaggingApi = savedObjectsTaggingService?.getTaggingApi();
  const references = savedObjectsTaggingApi?.ui.updateTagsReferences
    ? savedObjectsTaggingApi?.ui.updateTagsReferences(dashboardReferences, tags)
    : dashboardReferences;

  const allReferences = [
    ...references,
    ...(prefixedPanelReferences ?? []),
    ...(controlGroupReferences ?? []),
  ];
  return { attributes, references: allReferences };
};
