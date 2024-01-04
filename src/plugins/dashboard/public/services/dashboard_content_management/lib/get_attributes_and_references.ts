/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pick } from 'lodash';
import moment, { Moment } from 'moment';

import {
  getDefaultControlGroupInput,
  persistableControlGroupInputIsEqual,
  controlGroupInputToRawControlGroupAttributes,
  generateNewControlIds,
} from '@kbn/controls-plugin/common';
import { isFilterPinned } from '@kbn/es-query';
import { extractSearchSourceReferences, RefreshInterval } from '@kbn/data-plugin/public';

import { DashboardAttributesAndReferences } from '../../../../common/types';
import {
  extractReferences,
  DashboardContainerInput,
  convertPanelMapToSavedPanels,
} from '../../../../common';
import { SaveDashboardProps, DashboardContentManagementRequiredServices } from '../types';
import { convertDashboardVersionToNumber } from './dashboard_versioning';
import { LATEST_DASHBOARD_CONTAINER_VERSION } from '../../../dashboard_container';
import { generateNewPanelIds } from '../../../../common/lib/dashboard_panel_converters';
import { DashboardAttributes } from '../../../../common/content_management';

export const serializeControlGroupInput = (
  controlGroupInput: DashboardContainerInput['controlGroupInput']
) => {
  // only save to saved object if control group is not default
  if (
    !controlGroupInput ||
    persistableControlGroupInputIsEqual(controlGroupInput, getDefaultControlGroupInput())
  ) {
    return undefined;
  }
  return controlGroupInputToRawControlGroupAttributes(controlGroupInput);
};

export const convertTimeToUTCString = (time?: string | Moment): undefined | string => {
  if (moment(time).isValid()) {
    return moment(time).utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
  } else {
    // If it's not a valid moment date, then it should be a string representing a relative time
    // like 'now' or 'now-15m'.
    return time as string;
  }
};

type SaveDashboardStateProps = SaveDashboardProps & {
  data: DashboardContentManagementRequiredServices['data'];
  embeddable: DashboardContentManagementRequiredServices['embeddable'];
  savedObjectsTagging: DashboardContentManagementRequiredServices['savedObjectsTagging'];
};

export const getAttributesAndReferences = async ({
  data,
  embeddable,
  lastSavedId,
  saveOptions,
  currentState,
  savedObjectsTagging,
}: SaveDashboardStateProps): Promise<DashboardAttributesAndReferences> => {
  const {
    search: dataSearchService,
    query: {
      timefilter: { timefilter },
    },
  } = data;

  const {
    tags,
    query,
    title,
    filters,
    version,
    timeRestore,
    description,

    // Dashboard options
    useMargins,
    syncColors,
    syncCursor,
    syncTooltips,
    hidePanelTitles,
  } = currentState;

  let { panels, controlGroupInput } = currentState;
  if (saveOptions.saveAsCopy) {
    panels = generateNewPanelIds(panels);
    controlGroupInput = generateNewControlIds(controlGroupInput);
  }

  /**
   * Stringify filters and query into search source JSON
   */
  const { searchSourceJSON, searchSourceReferences } = await (async () => {
    const searchSource = await dataSearchService.searchSource.create();
    searchSource.setField(
      'filter', // save only unpinned filters
      filters.filter((filter) => !isFilterPinned(filter))
    );
    searchSource.setField('query', query);

    const rawSearchSourceFields = searchSource.getSerializedFields();
    const [fields, references] = extractSearchSourceReferences(rawSearchSourceFields);
    return { searchSourceReferences: references, searchSourceJSON: JSON.stringify(fields) };
  })();

  /**
   * Stringify options and panels
   */
  const optionsJSON = JSON.stringify({
    useMargins,
    syncColors,
    syncCursor,
    syncTooltips,
    hidePanelTitles,
  });
  const panelsJSON = JSON.stringify(convertPanelMapToSavedPanels(panels, true));

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
    version: convertDashboardVersionToNumber(version ?? LATEST_DASHBOARD_CONTAINER_VERSION),
    controlGroupInput: serializeControlGroupInput(controlGroupInput),
    kibanaSavedObjectMeta: { searchSourceJSON },
    description: description ?? '',
    refreshInterval,
    timeRestore,
    optionsJSON,
    panelsJSON,
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
    { embeddablePersistableStateService: embeddable }
  );

  const references = savedObjectsTagging.updateTagsReferences
    ? savedObjectsTagging.updateTagsReferences(dashboardReferences, tags)
    : dashboardReferences;

  return { attributes, references };
};
