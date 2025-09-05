/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flow } from 'lodash';

import type { Reference } from '@kbn/content-management-utils';
import type { ControlsGroupState } from '@kbn/controls-schemas';

import type { DashboardSavedObjectAttributes } from '../../../../dashboard_saved_object';
import { transformControlsState } from './transform_controls_state';

export const transformControlGroupOut: (
  controlGroupInput: NonNullable<DashboardSavedObjectAttributes['controlGroupInput']>,
  references: Reference[]
) => ControlsGroupState = flow(transformControlGroupProperties);

function transformControlGroupProperties(
  { panelsJSON }: Required<NonNullable<DashboardSavedObjectAttributes['controlGroupInput']>>,
  references: Reference[]
): ControlsGroupState {
  return {
    controls: panelsJSON ? transformControlsState(panelsJSON, references) : [],
  };
}

/**
 * TODO: Figure out how to send 'ignoreQuery' + 'ignoreFilters'  to the children and 'showApplySelections' to the dashboard
 */
// function transformIgnoreParentSettingsProperties({a
//   ignoreFilters,
//   ignoreQuery,
//   ignoreTimerange,
//   ignoreValidations,
// }: ControlsIgnoreParentSettings): ControlsIgnoreParentSettings {
//   return {
//     ignoreFilters,
//     ignoreQuery,
//     ignoreTimerange,
//     ignoreValidations,
//   };
// }
