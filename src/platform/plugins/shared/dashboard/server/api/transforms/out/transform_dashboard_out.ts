/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import { tagSavedObjectTypeName } from '@kbn/saved-objects-tagging-plugin/common';

import type { DashboardSavedObjectAttributes } from '../../../dashboard_saved_object';
import { getDashboardStateSchema } from '../../dashboard_state_schemas';
import type { DashboardState, Warnings } from '../../types';
import { transformOptionsOut } from './transform_options_out';
import { transformPanelsOut } from './transform_panels_out';
import { transformPinnedPanelsOut } from './transform_pinned_panels_out';
import { transformSearchSourceOut } from './transform_search_source_out';
import { DEFAULT_DASHBOARD_STATE } from '../../../../common/default_dashboard_state';

export function transformDashboardOut(
  attributes: DashboardSavedObjectAttributes | Partial<DashboardSavedObjectAttributes>,
  references: SavedObjectReference[] | undefined,
  isDashboardAppRequest: boolean = false,
  isReadRequest: boolean = false
): {
  dashboardState: DashboardState;
  warnings: Warnings;
} {
  const strictPropsSchemas = getDashboardStateSchema(false);

  const {
    pinned_panels,
    controlGroupInput: legacyControls,
    description,
    kibanaSavedObjectMeta,
    optionsJSON,
    panelsJSON,
    sections,
    refreshInterval,
    timeFrom,
    timeRestore,
    timeTo,
    title,
    projectRouting,
  } = attributes;

  // Extract tag references
  const tags: string[] = references
    ? references.filter(({ type }) => type === tagSavedObjectTypeName).map(({ id }) => id)
    : [];

  const { panels, warnings } = transformPanelsOut(
    panelsJSON,
    sections,
    references,
    isDashboardAppRequest,
    strictPropsSchemas
  );

  const { panels: pinnedPanels, warnings: pinnedPanelWarnings } = transformPinnedPanelsOut(
    legacyControls,
    pinned_panels,
    references,
    strictPropsSchemas
  );

  const timeRange =
    timeRestore && timeFrom && timeTo
      ? {
          from: timeFrom,
          to: timeTo,
        }
      : undefined;

  const options = transformOptionsOut(optionsJSON ?? '{}', legacyControls?.showApplySelections);

  const {
    filters,
    query,
    warnings: searchSourceWarnings,
  } = transformSearchSourceOut(kibanaSavedObjectMeta, references, strictPropsSchemas);

  /**
   * Handle validating each state key that wasn't already validated above; if any validation fails,
   * just default back to the default state for that key
   */
  let validatedState: Pick<
    DashboardState,
    | 'description'
    | 'project_routing'
    | 'refresh_interval'
    | 'tags'
    | 'time_range'
    | 'title'
    | 'options'
  > = {
    description,
    options,
    project_routing: projectRouting,
    ...(refreshInterval && {
      refresh_interval: { pause: refreshInterval.pause, value: refreshInterval.value },
    }),
    tags,
    time_range: timeRange,
    title: title ?? '',
  };
  (Object.keys(validatedState) as Array<keyof typeof validatedState>).forEach((key) => {
    try {
      validatedState = {
        ...validatedState,
        [key]: strictPropsSchemas.validateKey(key, validatedState[key]),
      };
    } catch (e) {
      validatedState = {
        ...validatedState,
        [key]: DEFAULT_DASHBOARD_STATE[key],
      };
    }
  });

  // try to maintain a consistent (alphabetical) order of keys
  return {
    dashboardState: {
      ...validatedState,
      /** These keys were validated seperately, since they each have unique error handling */
      ...(filters && { filters }),
      panels,
      pinned_panels: pinnedPanels,
      ...(query && { query }),
    },
    warnings: [...warnings, ...pinnedPanelWarnings, ...searchSourceWarnings],
  };
}
