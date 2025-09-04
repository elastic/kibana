/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import type { DashboardSavedObjectAttributes } from '../../../../dashboard_saved_object';
import type { DashboardAttributes } from '../../types';
import { transformControlGroupOut } from './transform_control_group_out';
import { transformSearchSourceOut } from './transform_search_source_out';
import { transformOptionsOut } from './transform_options_out';
import { transformPanelsOut } from './transform_panels_out';
import { ControlsGroupState } from '@kbn/controls-schemas';
import { Reference } from '@kbn/content-management-utils';

export function transformDashboardOut(
  attributes: DashboardSavedObjectAttributes | Partial<DashboardSavedObjectAttributes>,
  references?: SavedObjectReference[],
  getTagNamesFromReferences?: (references: SavedObjectReference[]) => string[]
): DashboardAttributes | Partial<DashboardAttributes> {
  const {
    controlGroupInput,
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
    version,
  } = attributes;
  // Inject any tag names from references into the attributes
  let tags: string[] | undefined;
  if (getTagNamesFromReferences && references && references.length) {
    tags = getTagNamesFromReferences(references);
  }

  // try to maintain a consistent (alphabetical) order of keys

  let controlGroupOut;
  if (controlGroupInput) {
    controlGroupOut = {
      controls: transformControlGroupOut(controlGroupInput).controls.map((control) => {
        return injectControlReferences(control.id!, control, references ?? []);
      }),
    };
  }
  console.log('HERE!', controlGroupOut);
  return {
    ...(controlGroupOut && { controlGroupInput: controlGroupOut }),
    ...(description && { description }),
    ...(kibanaSavedObjectMeta && {
      kibanaSavedObjectMeta: transformSearchSourceOut(kibanaSavedObjectMeta, references),
    }),
    ...(optionsJSON && { options: transformOptionsOut(optionsJSON) }),
    ...((panelsJSON || sections) && {
      panels: transformPanelsOut(panelsJSON, sections, references),
    }),
    ...(refreshInterval && {
      refreshInterval: { pause: refreshInterval.pause, value: refreshInterval.value },
    }),
    ...(tags && tags.length && { tags }),
    ...(timeFrom && { timeFrom }),
    timeRestore: timeRestore ?? false,
    ...(timeTo && { timeTo }),
    title,
    ...(version && { version }),
  };
}

const injectControlReferences = (
  id: string,
  state: Omit<ControlsGroupState['controls'][number], 'dataViewId'>,
  references: Reference[]
): ControlsGroupState['controls'][number] => {
  const deserializedState = {
    dataViewId: '',
    ...state,
  };
  references.forEach((reference) => {
    const referenceName = reference.name;
    const { controlId } = parseReferenceName(referenceName);
    if (controlId === id) deserializedState.dataViewId = reference.id;
  });
  return deserializedState;
};

const REFERENCE_NAME_PREFIX = 'controlGroup_';

export function parseReferenceName(referenceName: string) {
  return {
    controlId: referenceName.substring(
      REFERENCE_NAME_PREFIX.length,
      referenceName.lastIndexOf(':')
    ),
  };
}
