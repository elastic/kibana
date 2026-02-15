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
import type { DashboardState } from '../../types';
import { transformPinnedPanelsOut } from './transform_pinned_panels_out';
import { transformSearchSourceOut } from './transform_search_source_out';
import { transformOptionsOut } from './transform_options_out';
import { transformPanelsOut } from './transform_panels_out';

export function transformDashboardOut(
  attributes: DashboardSavedObjectAttributes | Partial<DashboardSavedObjectAttributes>,
  references?: SavedObjectReference[]
): DashboardState | Partial<DashboardState> {
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

  const pinnedPanelsOut = transformPinnedPanelsOut(legacyControls, pinned_panels, references ?? []);

  const timeRange =
    timeRestore && timeFrom && timeTo
      ? {
          from: timeFrom,
          to: timeTo,
        }
      : undefined;

  const options = transformOptionsOut(optionsJSON ?? '{}', legacyControls?.showApplySelections);

  // try to maintain a consistent (alphabetical) order of keys
  return {
    ...(description && { description }),
    ...transformSearchSourceOut(kibanaSavedObjectMeta, references),
    ...(Object.keys(options).length && { options }),
    ...((panelsJSON || sections) && {
      panels: transformPanelsOut(panelsJSON, sections, references),
    }),

    ...(pinnedPanelsOut && { pinned_panels: pinnedPanelsOut }),
    ...(projectRouting !== undefined && { project_routing: projectRouting }),
    ...(refreshInterval && {
      refresh_interval: { pause: refreshInterval.pause, value: refreshInterval.value },
    }),
    ...(tags && tags.length && { tags }),
    ...(timeRange && { time_range: timeRange }),
    title: title ?? '',
  };
}
