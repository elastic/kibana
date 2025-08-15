/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RefreshInterval } from '@kbn/data-plugin/public';
import { pick } from 'lodash';
import moment, { Moment } from 'moment';

import type { Reference } from '@kbn/content-management-utils';
import type { DashboardAttributes } from '../../server';

import type { DashboardState } from '../../common';
import { LATEST_VERSION } from '../../common/content_management';
import { dataService, savedObjectsTaggingService } from '../services/kibana_services';
import { DashboardApi } from './types';
import { generateNewPanelIds } from './generate_new_panel_ids';

export const convertTimeToUTCString = (time?: string | Moment): undefined | string => {
  if (moment(time).isValid()) {
    return moment(time).utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
  } else {
    // If it's not a valid moment date, then it should be a string representing a relative time
    // like 'now' or 'now-15m'.
    return time as string;
  }
};

export const getSerializedState = ({
  controlGroupReferences,
  generateNewIds,
  dashboardState,
  panelReferences,
}: {
  controlGroupReferences?: Reference[];
  generateNewIds?: boolean;
  dashboardState: DashboardState;
  panelReferences?: Reference[];
}): ReturnType<DashboardApi['getSerializedState']> => {
  const {
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
  } = dashboardState;

  let { panels } = dashboardState;
  let prefixedPanelReferences = panelReferences;
  if (generateNewIds) {
    const { newPanels, newPanelReferences } = generateNewPanelIds(panels, panelReferences);
    panels = newPanels;
    prefixedPanelReferences = newPanelReferences;
    //
    // do not need to generate new ids for controls.
    // ControlGroup Component is keyed on dashboard id so changing dashboard id mounts new ControlGroup Component.
    //
  }

  const searchSource = { filters, query };
  const options = {
    useMargins,
    syncColors,
    syncCursor,
    syncTooltips,
    hidePanelTitles,
  };

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

  const attributes: DashboardAttributes = {
    version: LATEST_VERSION,
    controlGroupInput: controlGroupInput as DashboardAttributes['controlGroupInput'],
    kibanaSavedObjectMeta: { searchSource },
    description: description ?? '',
    refreshInterval,
    timeRestore,
    options,
    panels,
    timeFrom,
    title,
    timeTo,
  };

  // TODO Provide tags as an array of tag names in the attribute. In that case, tag references
  // will be extracted by the server.
  const savedObjectsTaggingApi = savedObjectsTaggingService?.getTaggingApi();
  const references = savedObjectsTaggingApi?.ui.updateTagsReferences
    ? savedObjectsTaggingApi?.ui.updateTagsReferences([], tags)
    : [];

  const allReferences = [
    ...references,
    ...(prefixedPanelReferences ?? []),
    ...(controlGroupReferences ?? []),
  ];
  return { attributes, references: allReferences };
};
